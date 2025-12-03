// Handle all endpoints start with /transactions
'use strict';

import express from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { shapePromoIds, pointsFromSpent, txToResponse, promoBonusFromSpent} from '../helpers/promoTx.js';
import { isValidUtorid } from '../helpers/validation.js';

const router = express.Router();

// POST for /transactions (Cashier or higher & Manager or higher)
router.post('/transactions', authenticateToken, requireRole('cashier'), async (req, res) => {
    const {utorid, type, spent, amount, relatedId, promotionIds, remark} = req.body || {};
    if (!isValidUtorid(utorid)) {
        return res.status(400).json({error:'Invalid utorid'});
    }
    const promoIdsArray = Array.isArray(promotionIds) ? promotionIds : [];
    for (const pid of promoIdsArray) {
        if (!Number.isInteger(Number(pid))) {
            return res.status(400).json({error: 'promotionIds must contain integers'});
        }
    }
    try {
        const customer = await prisma.user.findUnique({where: {utorid}});
        if (!customer) {
            return res.status(404).json({ error: 'User not found' });
        }
        const creator = await prisma.user.findUnique({where: {id: req.user.id}});
        if (!creator) {
            return res.status(401).json({error: 'Unauthorized'});
        }
        if (type === 'purchase') {
            if (typeof spent !== 'number' || !isFinite(spent) || spent <= 0) {
                return res.status(400).json({error: 'spent must be a positive number'});
            }
            // Base points from spending
            const basePoints = pointsFromSpent(spent);

            // Fetch all promotions we might apply
            const requestedIds = promoIdsArray.map(x => Number(x));
            
            // Active automatic promotions that qualify for this spending
            const now = new Date();
            const automaticPromos = await prisma.promotion.findMany({
                where: {
                    type: 'automatic',
                    startTime: { lte: now },
                    endTime:   { gt:  now },
                    OR: [
                        { minSpending: null },
                        { minSpending: { lte: spent } },
                    ],
                },
            });

            // Load all requested promos (one-time)
            const requestedPromos = requestedIds.length > 0
                ? await prisma.promotion.findMany({
                    where: { id: { in: requestedIds } },
                })
                : [];
            
            if (requestedPromos.length !== requestedIds.length) {
                return res.status(400).json({error: 'One or more promotions do not exist'});
            }

            // Validate requested promos: must be one-time, active, not reused
            for (const pr of requestedPromos) {
                if (pr.type !== 'onetime') {
                    return res.status(400).json({error: 'Only one-time promotions may be manually applied'});
                }
                const start = new Date(pr.startTime);
                const end = new Date(pr.endTime)
                if (!(start <= now && end > now)) {
                    return res.status(400).json({error: `Promotion ${pr.id} is not active`});
                }
                if (pr.minSpending != null && spent < pr.minSpending) {
                    return res.status(400).json({error: `Promotion ${pr.id} requires a minimum spending of ${pr.minSpending}`});
                }
                const previousTxs = await prisma.transaction.findMany({
                    where: { userId: customer.id },
                    select: { promotionIds: true },
                });

                const alreadyUsed = previousTxs.some(tx => {
                    const ids = shapePromoIds(tx.promotionIds);
                    return ids.includes(pr.id);
                });

                if (alreadyUsed) {
                    return res.status(400).json({error: `Promotion ${pr.id} has already been used by this user`});
                }
            }
            const allPromos = [...automaticPromos, ...requestedPromos];
            const allPromoIds = [...new Set(allPromos.map(p => p.id))];

            let promoBonus = 0;
            for (const promo of allPromos) {
                if (promo.minSpending == null || spent >= promo.minSpending) {
                    promoBonus += promoBonusFromSpent(spent, promo);
                }
            }

            const earned = basePoints + promoBonus;
            const isSuspicious = !!creator.suspicious;

            const txData = {
                userId: customer.id,
                amount: earned,
                type: 'purchase',
                relatedId: null,
                spent,
                remark: typeof remark === 'string' ? remark : '',
                suspicious: isSuspicious,
                promotionIds: allPromoIds,
                createdById: creator.id,
            }; 

            let saved;
            if (isSuspicious) {
                // suspicious => do not touch customer points
                saved = await prisma.transaction.create({ data: txData });
                return res.status(201).json({
                    id: saved.id,
                    utorid: customer.utorid,
                    spent,
                    earned,
                    type: saved.type,
                    relatedId: saved.relatedId,
                    remark: saved.remark || '',
                    createdBy: creator.utorid,
                    suspicious: true,
                    promotionIds: shapePromoIds(saved.promotionIds),
                });
            }

            saved = await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: {id: customer.id},
                    data: {points: {increment: earned}},
                });
                const t = await tx.transaction.create({ data: txData });
                return { user: updatedUser, tx: t };
            });

            return res.status(201).json({
                id: saved.tx.id,
                utorid: customer.utorid,
                type: 'purchase',
                spent,
                earned,
                remark: saved.tx.remark || '',
                promotionIds: shapePromoIds(saved.tx.promotionIds),
                createdBy: creator.utorid,
            });
        }
        if (type === 'adjustment') {
            if (!['manager', 'superuser'].includes(creator.role)) {
                return res.status(403).json({error: 'Only managers can create adjustments'});
            }
            if (promoIdsArray.length > 0) {
                return res.status(400).json({error: 'Promotions not supported on adjustment transactions'});
            }
            if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(Math.round(amount))) {
                return res.status(400).json({error: 'Amount must be an integer'});
            }
            if (typeof relatedId !== 'number' || !Number.isInteger(relatedId)) {
                return res.status(400).json({ error: 'relatedId is required for adjustment' });
            }
            const tx = await prisma.transaction.create({
                data: {
                    userId: customer.id,
                    type: 'adjustment',
                    amount: Math.trunc(amount),
                    relatedId,
                    remark: typeof remark === 'string' ? remark : '',
                    suspicious: false,
                    promotionIds: [],
                    createdById: creator.id,
                }
            });
            await prisma.user.update({
                where: {id: customer.id},
                data: {points: {increment: Math.trunc(amount)}}
            });
            return res.status(201).json({
                id: tx.id,
                utorid: customer.utorid,
                amount: tx.amount,
                type: 'adjustment',
                relatedId,
                remark: tx.remark || '',
                promotionIds: shapePromoIds(tx.promotionIds),
                createdBy: creator.utorid,
            });
        }
        return res.status(400).json({ error: 'type must be "purchase" or "adjustment"' });
    } catch (err) {
        console.error('POST /transactions error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET for /transactions (Manager or higher)
router.get('/transactions', authenticateToken, async (req, res) => {
    const {name, createdBy, suspicious, promotionId, type, relatedId, 
        amount, operator, page = 1, limit = 10} = req.query;
    const role = String(req.user.role || '').toLowerCase();
    const isManagerPlus = role === 'manager' || role === 'superuser';
    if (!isManagerPlus) {
        if (role !== 'cashier') {
            return res.status(403).json({ error: 'Forbidden: insufficient clearance' });
        }
        if (!req.user.utorid) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.query.createdBy = req.user.utorid;
    }
    const pid = promotionId !== undefined ? Number(promotionId) : null;
    if (pid !== null && !Number.isInteger(pid)) {
        return res.status(400).json({error: 'promotionId must be an integer'});
    }
    const where = {};
    if (name) {
        where.user = {
            OR: [
                {utorid: {contains: String(name)}},
                {name: {contains: String(name)}},
            ]
        };
    }
    if (createdBy || (!isManagerPlus && role === 'cashier')) {
        const target = String(createdBy ?? req.user.utorid);
        if (createdBy) {
            where.createdBy = {
                utorid: { contains: target },
            };
        } else {
            where.createdBy = { utorid: target };
        }
    }
    if (suspicious !== undefined) {
        where.suspicious = String(suspicious) === 'true';
    }
    if (type) {
        where.type = String(type);
    }
    if (relatedId !== undefined) {
        if (!type) {
            return res.status(400).json({error: 'relatedId filter must be used with type'});
        }
        const rid = Number(relatedId);
        if (!Number.isInteger(rid)) {
            return res.status(400).json({error: 'relatedId must be an integer'});
        }
        where.relatedId = rid;
    }
    if (amount !== undefined) {
        const val = Number(amount);
        if (!Number.isFinite(val)) {
            return res.status(400).json({error: 'amount must be a number'});
        }
        if (operator === 'gte') {
            where.amount = {gte: val};
        } else if (operator === 'lte') {
            where.amount = { lte: val };
        } else {
            return res.status(400).json({ error: 'operator must be "gte" or "lte"' });
        }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    try {
        const [countRaw, rowsRaw] = await Promise.all([
            prisma.transaction.count({where}),
            prisma.transaction.findMany({
                where,
                skip,
                take,
                orderBy: {id: 'asc'},
                include: {
                    user: {select: {utorid: true}},
                    createdBy: {select: {utorid: true}},
                }
            })
        ]);
        let rows = rowsRaw;
        let count = countRaw;
        if (pid !== null) {
            rows = rowsRaw.filter(tx =>
                Array.isArray(tx.promotionIds) &&
                tx.promotionIds.map(Number).includes(pid)
            );
            count = rows.length;
        }
        const results = rows.map(tx => {
            const base = {
                id: tx.id,
                utorid: tx.user.utorid,
                amount: tx.amount,
                type: tx.type,
                promotionIds: shapePromoIds(tx.promotionIds),
                suspicious: tx.suspicious,
                remark: tx.remark || '',
                createdBy: tx.createdBy?.utorid || null,
            };
            if (tx.type === 'purchase') base.spent = tx.spent ?? null;
            if (tx.type === 'adjustment') base.relatedId = tx.relatedId ?? null;
            if (tx.type === 'redemption') {
                base.relatedId = tx.relatedId ?? null;
                base.redeemed  = tx.redeemed ?? Math.abs(tx.amount);
            }
            return base;
        });
        return res.status(200).json({count, results});
    } catch (err) {
        console.error('GET /transactions error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET for /transactions/:transactionId (Manager or higher)
router.get('/transactions/:transactionId', authenticateToken, requireRole('manager'), async (req, res) => {
    const id = Number(req.params.transactionId);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid transactionId' });
    }
    try {
        const tx = await prisma.transaction.findUnique({
            where: {id},
            include: {
                user: {select: {utorid: true}},
                createdBy: {select: {utorid: true}},
            },
        });
        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        return res.status(200).json(txToResponse(tx));
    } catch (err) {
        console.error('GET /transactions/:id error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH for /transactions/:transactionId/suspicious (Manager or higher)
router.patch('/transactions/:transactionId/suspicious', authenticateToken, requireRole('manager'), async (req, res) => {
    const id = Number(req.params.transactionId);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid transactionId' });
    }
    const {suspicious} = req.body ?? {};
    if (typeof suspicious !== 'boolean') {
        return res.status(400).json({ error: 'suspicious must be boolean' });
    }
    try {
        const current = await prisma.transaction.findUnique({
            where: {id},
            include: {
                user: {select: {id: true, utorid: true}},
                createdBy: {select: {utorid: true}},
            },
        });
        if (!current) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        if (current.suspicious === suspicious) {
            const same = await prisma.transaction.findUnique({
                where: {id},
                include: {
                    user: {select: {id: true, utorid: true}},
                    createdBy: {select: {utorid: true}},
                },
            });
            return res.status(200).json(txToResponse(same));
        }
        const updated = await prisma.$transaction(async (t) => {
            const txUpdated = await t.transaction.update({
                where: {id},
                data: {suspicious},
                include: {
                    user: {select: {id: true, utorid: true}},
                    createdBy: {select: {utorid: true}},
                }
            });
            const delta = 
                current.suspicious === false && suspicious === true
                ? -current.amount
                : current.suspicious === true && suspicious === false
                ? +current.amount
                : 0;
            if (delta !== 0) {
                await t.user.update({
                    where: {id: current.userId},
                    data: {points: {increment: delta}},
                });
            }
            return txUpdated;
        });
        const txFull = await prisma.transaction.findUnique({
            where: {id: updated.id},
            include: {
                user: {select: {utorid: true}},
                createdBy: {select: {utorid: true}},
            },
        });
        return res.status(200).json(txToResponse(txFull));
    } catch (err) {
        console.error('PATCH /transactions/:id/suspicious error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST for /users/me/transactions (Regular or higher)
router.post('/users/me/transactions', authenticateToken, requireRole('regular'), async (req, res) => {
    const {type, amount, remark = ''} = req.body || {};
    if (type !== 'redemption') {
        return res.status(400).json({error: 'type must be "redemption"'});
    }
    const pts = Number(amount);
    if (!Number.isInteger(pts) || pts <= 0) {
        return res.status(400).json({error: 'amount must be a positive integer'});
    }
    try {
        const me = await prisma.user.findUnique({where: {id: req.user.id}});
        if (!me) {
            return res.status(404).json({error: 'User not found'});
        }
        if (!me.verified) {
            return res.status(403).json({error: 'Forbidden: user not verified'});
        }
        if (me.points < pts) {
            return res.status(400).json({error: 'Requested amount exceeds point balance'});
        }
        const tx = await prisma.transaction.create({
            data: {
                userId: me.id,
                type: 'redemption',
                amount: 0,
                redeemed: pts,
                remark,
                promotionIds: [],
                createdById: me.id,
                processedById: null,
            },
        });
        return res.status(201).json({
            id: tx.id,
            utorid: me.utorid,
            type: 'redemption',
            processedBy: null,
            amount: pts,
            remark,
            createdBy: me.utorid,
        });
    } catch (err) {
        console.error('POST /users/me/transactions error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// POST for /users/:userId/transactions (Regular or higher)
router.post('/users/:userId/transactions', authenticateToken, requireRole('regular'), async (req, res) => {
    const recipientId = Number(req.params.userId);
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    const {type, amount, remark = ''} = req.body || {};
    if (type !== 'transfer') {
        return res.status(400).json({error: 'type must be "transfer"'});
    }
    const pts = Number(amount);
    if (!Number.isInteger(pts) || pts <= 0) {
        return res.status(400).json({error: 'amount must be a positive integer'});
    }
    try {
        const [sender, recipient] = await Promise.all([
            prisma.user.findUnique({where: {id: req.user.id}}),
            prisma.user.findUnique({where: {id: recipientId}}),
        ]);
        if (!sender) {
            return res.status(404).json({ error: 'Sender not found' });
        }
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }
        if (sender.id === recipient.id) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }
        if (!sender.verified) {
            return res.status(403).json({ error: 'Forbidden: sender not verified' });
        }
        if (sender.points < pts) {
            return res.status(400).json({ error: 'Insufficient points' });
        }
        const [senderTx] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    userId: sender.id,
                    type: 'transfer',
                    amount: -pts,
                    relatedId: recipient.id,
                    remark,
                    promotionIds: [],
                    createdById: sender.id,
                },
            }),
            prisma.transaction.create({
                data: {
                    userId: recipient.id,
                    type: 'transfer',
                    amount: pts,
                    relatedId: sender.id,
                    remark,
                    promotionIds: [],
                    createdById: sender.id,
                },
            }),
            prisma.user.update({where: {id: sender.id}, data: {points: {decrement: pts}}}),
            prisma.user.update({where: {id: recipient.id}, data: {points: {increment: pts}}}),
        ]);
        return res.status(201).json({
            id: senderTx.id,
            sender: sender.utorid,
            recipient: recipient.utorid,
            type: 'transfer',
            sent: pts,
            remark,
            createdBy: sender.utorid,
        });
    } catch (err) {
        console.error('POST /users/:userId/transactions error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /users/me/transactions (Regular or higher)
router.get('/users/me/transactions', authenticateToken, requireRole('regular'), async (req, res) => {
    const {type, relatedId, promotionId, amount, operator, page = '1', limit = '10',} = req.query;
    const where = {userId: req.user.id};
    if (type) {
        where.type = type;
    }
    if (relatedId !== undefined) {
        const rid = Number(relatedId);
        if (!Number.isInteger(rid)) {
            return res.status(400).json({error: 'relatedId must be an integer'});
        }
        where.relatedId = rid;
    }
    if (amount !== undefined && operator) {
        const val = Number(amount);
        if (!Number.isFinite(val)) {
            return res.status(400).json({error: 'amount filter must be numeric'});
        }
        if (operator !== 'gte' && operator !== 'lte') {
            return res.status(400).json({error: 'operator must be "gte" or "lte"'});
        }
        where.amount = operator === 'gte' ? { gte: val } : { lte: val };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    try {
        const [count, rows] = await Promise.all([
            prisma.transaction.count({where}),
            prisma.transaction.findMany({
                where,
                skip,
                take,
                orderBy: {id: 'asc'},
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    redeemed: true,
                    spent: true,
                    relatedId: true,
                    remark: true,
                    promotionIds: true,
                    createdBy: {select: {utorid: true}},
                    processedById: true,
                },
            }),
        ]);
        const pid = promotionId === undefined ? null : Number(promotionId);
        const results = rows.filter(tx => {
            if (pid == null) return true;
            const ids = shapePromoIds(tx.promotionIds); // int[]
            return ids.includes(pid);
        }).map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: (tx.type === 'redemption' && tx.processedById == null && typeof tx.redeemed === 'number')
                ? tx.redeemed
                : tx.amount,
            ...(tx.spent != null ? {spent: tx.spent} : {}),
            ...(tx.relatedId != null ? {relatedId: tx.relatedId} : {}),
            promotionIds: shapePromoIds(tx.promotionIds),
            remark: tx.remark || '',
            createdBy: tx.createdBy?.utorid || null,
        }));
        return res.status(200).json({count, results});
    } catch (err) {
        console.error('GET /users/me/transactions error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /transactions/:transactionId/processed (Cashier or higher)
router.patch('/transactions/:transactionId/processed', authenticateToken, requireRole('cashier'), async (req, res) =>  {
    const txId = Number(req.params.transactionId);
    if (!Number.isInteger(txId)) {
        return res.status(400).json({error: 'Invalid transactionId'});
    }
    const {processed} = req.body || {};
    if (processed !== true) {
        return res.status(400).json({error: 'processed must be true'});
    }
    try {
        const tx = await prisma.transaction.findUnique({
            where: {id: txId},
            include: {
                user: {select: {id: true, utorid: true, points: true}},
                createdBy: {select: {utorid: true}},
            }
        });
        if (!tx) {
            return res.status(404).json({error: 'Transaction not found'});
        }
        if (tx.type !== 'redemption') {
            return res.status(400).json({error: 'Only redemption transactions can be processed'});
        }
        if (tx.processedById != null) {
            return res.status(400).json({error: 'Redemption already processed'});
        }
        const redeem = tx.redeemed ?? 0;
        if (!Number.isInteger(redeem) || redeem <= 0) {
            return res.status(400).json({error: 'Invalid redemption amount'});
        }
        if (tx.user.points < redeem) {
            return res.status(400).json({error: 'User no longer has enough points'});
        }
        const [updated] = await prisma.$transaction([
            prisma.transaction.update({
                where: {id: tx.id},
                data: {
                    processedById: req.user.id,
                    amount: -redeem,
                },
                include: {
                    user: {select: {utorid: true}},
                },
            }),
            prisma.user.update({
                where: {id: tx.userId},
                data: {points: {decrement: redeem}},
            }),
        ]);
        const cashier = await prisma.user.findUnique({where: {id: req.user.id}, select: {utorid: true}});
        return res.status(200).json({
            id: updated.id,
            utorid: updated.user.utorid,
            type: 'redemption',
            processedBy: cashier?.utorid || null,
            redeemed: redeem,
            remark: tx.remark || '',
            createdBy: tx.createdBy?.utorid || null,
        });
    } catch (err) {
        console.error('PATCH /transactions/:transactionId/processed error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
