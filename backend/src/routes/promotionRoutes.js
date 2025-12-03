// Handle all endpoints start with /promotions
'use strict';

import express from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { isManager, parseISO, toBool } from '../helpers/clearance.js'

const router = express.Router();

// POST for /promotions (Manager or higher)
router.post('/promotions', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const {name, description, type, startTime, endTime, minSpending, rate, points} = req.body ?? {};
        if (typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({error: 'name is required.'});
        }
        if (typeof description !== 'string') {
            return res.status(400).json({error: 'description is required.'});
        }
        if (type !== 'automatic' && type !== 'onetime') {
            return res.status(400).json({error: 'type must be "automatic" or "onetime".'});
        }
        const s = parseISO(startTime);
        const e = parseISO(endTime);
        if (!s || !e) {
            return res.status(400).json({error: 'startTime/endTime must be ISO 8601 strings.'});
        }
        const now = new Date();
        if (s <= now) {
            return res.status(400).json({error: 'startTime must not be in the past.'});
        }
        if (e <= s) {
            return res.status(400).json({error: 'endTime must be after startTime.'});
        }
        if (minSpending !== undefined && (typeof minSpending !== 'number' || !isFinite(minSpending) || minSpending <= 0)) {
            return res.status(400).json({error: 'minSpending must be a positive number if provided.'});
        }
        if (rate !== undefined && (typeof rate !== 'number' || !isFinite(rate) || rate <= 0)) {
            return res.status(400).json({ error: 'rate must be a positive number if provided.' });
        }
        if (points !== undefined && (!Number.isInteger(points) || points <= 0)) {
            return res.status(400).json({error: 'points must be a positive integer if provided.'});
        }
        const created = await prisma.promotion.create({
            data: {
                name: name.trim(),
                description,
                type,
                startTime: s,
                endTime: e,
                minSpending: minSpending ?? null,
                rate: rate ?? null,
                points: points ?? null,
            },
        });
        return res.status(201).json({
            id: created.id,
            name: created.name,
            description: created.description,
            type: created.type,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
            minSpending: created.minSpending ?? null,
            rate: created.rate ?? null,
            points: created.points ?? 0,
        });
    } catch (err) {
        console.error('POST /promotions error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /promotions (Regular or higher & Manager or higher)
router.get('/promotions', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const managerView = isManager(req.user);
        const {name, type, page = 1, limit = 10, started, ended} = req.query;
        const p = Number(page);
        const l = Number(limit);
        if (!Number.isInteger(p) || p <= 0) {
            return res.status(400).json({ error: 'page must be a positive integer' });
        }
        if (!Number.isInteger(l) || l <= 0 || l > 100) {
            return res.status(400).json({ error: 'limit must be between 1 and 100' });
        }
        if (type && type !== 'automatic' && type !== 'onetime') {
            return res.status(400).json({error: 'type filter must be "automatic" or "onetime".'});
        }
        if (!managerView && (started !== undefined || ended !== undefined)) {
            return res.status(400).json({ error: 'started/ended filters are for managers only.' });
        }
        if (started !== undefined && ended !== undefined) {
            return res.status(400).json({error: 'Specify at most one of started or ended.'});
        }
        const where = {};
        if (name) {
            where.name = {contains: String(name)};
        }
        if (type) {
            where.type = type;
        }
        const now = new Date();
        if (managerView) {
            if (started !== undefined) {
                where.startTime = toBool(started) ? {lte: now} : {gt: now};
            }
            if (ended !== undefined) {
                where.endTime = toBool(ended) ? {lte: now} : {gt: now};
            }
        } else {
            where.startTime = {lte: now};
            where.endTime = {gt: now};
        }
        const all = await prisma.promotion.findMany({
            where,
            orderBy: {id: 'asc'},
        });
        const total = all.length;
        const slice = all.slice((p - 1) * l, p * l);
        const results = slice.map(pr => {
            const base = {
                id: pr.id,
                name: pr.name,
                type: pr.type,
                endTime: pr.endTime.toISOString(),
                minSpending: pr.minSpending ?? null,
                rate: pr.rate ?? null,
                points: pr.points ?? 0,
            };
            return managerView
                ? {...base, startTime: pr.startTime.toISOString()}
                : base;
        });
        return res.status(200).json({count: total, results});
    } catch (err) {
        console.error('GET /promotions error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET for /promotions/:promotionId (Regular or higher)
function promoTypeIn(s) {
    if (s === 'automatic') return 'automatic';
    if (s === 'one-time') return 'onetime';     // DB enum
    return null;
}

function promoTypeOut(db) {
    return db === 'onetime' ? 'one-time' : db;  // wire enum
}
  
function shapeSinglePromo(p) {
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        type: promoTypeOut(p.type),
        endTime: p.endTime.toISOString(),
        ...(p.minSpending != null ? { minSpending: Number(p.minSpending) } : {}),
        ...(p.rate != null ? { rate: Number(p.rate) } : {}),
        ...(p.points != null ? { points: p.points } : {}),
    };
}

router.get('/promotions/:promotionId', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const id = Number(req.params.promotionId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid promotionId'});
        }
        const promo = await prisma.promotion.findUnique({where: {id}});
        if (!promo) {
            return res.status(404).json({error: 'Promotion not found'});
        }
        const now = new Date();
        const isActive = promo.startTime <= now && now < promo.endTime;
        const isManagerPlus = (req.user.role === 'manager' || req.user.role === 'superuser');
        if (!isManagerPlus && !isActive) {
            return res.status(404).json({error: 'Promotion not found'});
        }
        return res.status(200).json(shapeSinglePromo(promo));
    } catch (err) {
        console.error('GET /promotions/:promotionId error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /promotions/:promotionId (Manager or higher)
router.patch('/promotions/:promotionId', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const id = Number(req.params.promotionId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid promotionId'});
        }
        const original = await prisma.promotion.findUnique({where: {id}});
        if (!original) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        const {name, description, type, startTime, endTime, minSpending, rate, points,} = req.body ?? {};
        const now = new Date();
        const updates = {};
        let s = null, e = null;
        if (startTime !== undefined) {
            s = parseISO(startTime);
            if (!s) {
                return res.status(400).json({error: 'startTime must be ISO 8601'});
            }
            if (s < now) {
                return res.status(400).json({error: 'startTime cannot be in the past'});
            }
            updates.startTime = s;
        }
        if (endTime !== undefined) {
            e = parseISO(endTime);
            if (!e) {
                return res.status(400).json({error: 'endTime must be ISO 8601'});
            }
            if (e < now) {
                return res.status(400).json({error: 'endTime cannot be in the past'});
            }
            updates.endTime = e;
        }
        if (now >= original.startTime) {
            if (name !== undefined || description !== undefined || type !== undefined ||
                startTime !== undefined || minSpending !== undefined ||
                rate !== undefined || points !== undefined) {
                    return res.status(400).json({
                        error: 'Cannot update name/description/type/startTime/minSpending/rate/points after original start time',
                    });
                }
        }
        if (now >= original.endTime && endTime !== undefined) {
            return res.status(400).json({error: 'Cannot update endTime after original end time'});
        }
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({error: 'name must be non-empty string'});
            }
            updates.name = name;
        }
        if (description !== undefined) {
            if (typeof description !== 'string') {
                return res.status(400).json({error: 'description must be string'});
            }
            updates.description = description;
        }
        if (type !== undefined) {
            const dbType = promoTypeIn(type);
            if (!dbType) {
                return res.status(400).json({error: 'type must be "automatic" or "one-time"'});
            }
            updates.type = dbType;
        }
        if (minSpending !== undefined) {
            const v = Number(minSpending);
            if (!Number.isFinite(v) || v <= 0) {
                return res.status(400).json({error: 'minSpending must be a positive number'});
            }
            updates.minSpending = v;
        }
        if (rate !== undefined) {
            const v = Number(rate);
            if (!Number.isFinite(v) || v <= 0) {
                return res.status(400).json({error: 'rate must be a positive number'});
            }
            updates.rate = v;
        }
        if (points !== undefined) {
            const v = Number(points);
            if (!Number.isInteger(v) || v <= 0) {
                return res.status(400).json({error: 'points must be a positive integer'});
            }
            updates.points = v;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({error: 'No valid fields to update'});
        }
        const newStart = updates.startTime ?? original.startTime;
        const newEnd = updates.endTime ?? original.endTime;
        if (newEnd <= newStart) {
            return res.status(400).json({error: 'endTime must be after startTime'});
        }
        const saved = await prisma.promotion.update({where: {id}, data: updates});
        const resp = {
            id: saved.id,
            name: saved.name,
            type: promoTypeOut(saved.type),
        };
        if ('description' in req.body) {
            resp.description = saved.description;
        }
        if ('startTime' in req.body) {
            resp.startTime = saved.startTime.toISOString();
        }
        if ('endTime' in req.body) {
            resp.endTime = saved.endTime.toISOString();
        }
        if ('minSpending' in req.body) {
            resp.minSpending = saved.minSpending;
        }
        if ('rate' in req.body) {
            resp.rate = saved.rate;
        }
        if ('points' in req.body) {
            resp.points = saved.points;
        }
        return res.status(200).json(resp);
    } catch (err) {
        console.error('PATCH /promotions/:promotionId error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE for /promotions/:promotionId (Manager or higher)
router.delete('/promotions/:promotionId', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const id = Number(req.params.promotionId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid promotionId'});
        }
        const promo = await prisma.promotion.findUnique({where: {id}});
        if (!promo) {
            return res.status(404).json({error: 'Promotion not found'});
        }
        if (new Date() >= promo.startTime) {
            return res.status(403).json({error: 'Cannot delete a promotion that has already started'});
        }
        await prisma.promotion.delete({where: {id}});
        return res.status(204).send();
    } catch (err) {
        console.error('DELETE /promotions/:promotionId error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

export default router;
