// Handle all endpoints start with /users
'use strict';

import express from 'express';
import prisma from '../db.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
    isValidUtorid,
    isValidUofTEmail,
    isValidName,
    isValidPassword,
    parseBirthday,
} from '../helpers/validation.js';
import { parsePagination, buildUserFilters, toISO } from '../helpers/userQuery.js';

const router = express.Router();

async function getAvailableOneTimePromosForUser(userId) {
    const now = new Date();
    const active = await prisma.promotion.findMany({
        where: {
            type: 'onetime',
            startTime: {lte: now},
            endTime: {gt: now},
        },
        select: {id: true, name: true, minSpending: true, rate: true, points: true},
        orderBy: {id: 'asc'},
    });
    const userTx = await prisma.transaction.findMany({
        where: {userId},
        select: {promotionIds: true},
    });
    const used = new Set(
        userTx.flatMap(t => Array.isArray(t.promotionIds) ? t.promotionIds : [])
    );
    return active.filter(p => !used.has(p.id)).map(p => ({
        id: p.id,
        name: p.name,
        minSpending: p.minSpending ?? null,
        rate: p.rate ?? null,
        points: p.points ?? 0,
    }));
}

// POST for /users (Cashier or higher)
router.post('/', authenticateToken, requireRole('cashier'), async(req, res) => {
    const {utorid, name, email} = req.body;
    if (!isValidUtorid(utorid)) {
        return res.status(400).json({error: 'utorid must be 7-8 alphanumeric characters.'});
    }
    if (!isValidName(name)) {
        return res.status(400).json({error: 'name must be 1-50 characters.'});
    }
    if (!isValidUofTEmail(email)) {
        return res.status(400).json({error: 'email must be a valid UofT address.'});
    }
    try {
        const existing = await prisma.user.findUnique({where: {utorid}});
        if (existing) {
            return res.status(409).json({error: 'User already exists.'});
        }
        const resetToken = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const user = await prisma.user.create({
            data: {
                utorid,
                email,
                name,
                verified: false,
                passwordHash: '',
                resetToken,
                expiresAt,
            },
            select: {id: true, utorid: true, name: true, email: true, verified: true},
        });
        return res.status(201).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            verified: false,
            expiresAt: expiresAt.toISOString(),
            resetToken,
        });
    } catch (err) {
        console.error('Error creating user:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({error: 'Email or utorid already exists.'});
        }
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /users (Manager or higher)
router.get('/', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        let skip, take;
        try {
            ({ skip, take } = parsePagination(req.query))
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
        let where;
        try {
            where = buildUserFilters(req.query);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
        const [count, results] = await Promise.all([
            prisma.user.count({where}),
            prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: {id: 'asc'},
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                role: true,
                points: true,
                createdAt: true,
                lastLogin: true,
                verified: true,
                avatarUrl: true,
                suspicious: true,
            }
        }),
    ]);
        return res.status(200).json({ count, results });
    } catch (err) {
        console.error('Error fetching users:', err); 
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /users/me (Regular or higher)
router.patch('/me', authenticateToken, async (req, res) => {
    const {name, email, birthday, avatar} = req.body;
    const updates = {};

    if (name !== undefined) {
        if (!isValidName(name)) {
            return res.status(400).json({error: 'Name must be 1–50 characters.'});
        }
        updates.name = name;
    }
    if (email !== undefined) {
        if (!isValidUofTEmail(email)) {
            return res.status(400).json({error: 'Email must be a valid UofT address.'});
        }
        updates.email = email;
    }
    if (birthday !== undefined && birthday !== null) {
        try {
            updates.birthday = parseBirthday(birthday);
        } catch {
            return res.status(400).json({ message: 'Invalid birthday' });
        }
    }
    if (avatar !== undefined) {
        if (typeof avatar !== 'string') {
            return res.status(400).json({error: 'Avatar must be a string path.'});
        }
        updates.avatarUrl = avatar;
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({error: 'No valid fields to update.'});
    }
    try {
        const updatedUser = await prisma.user.update({
            where: {id: req.user.id},
            data: updates,
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                verified: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                points: true,
                lastLogin: true,
            },
        });
        const u = updatedUser;
        return res.status(200).json({
            id: u.id,
            utorid: u.utorid,
            name: u.name ?? null,
            email: u.email,
            birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
            role: u.role,
            verified: u.verified,
            avatarUrl: u.avatarUrl ?? null,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            points: u.points,
            lastLogin: u.lastLogin 
                ? new Date(u.lastLogin).toISOString() 
                : new Date(0).toISOString(),
        });
    } catch (err) {
        console.error('Error updating user:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({error: 'Email already exists.'});
        }
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /users/me (Regular or higher)
router.get('/me', authenticateToken, async(req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                verified: true,
                avatarUrl: true,
                points: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true,
            }
        });
        if (!user) {
            return res.status(404).json({error: 'User not found'});
        }
        const [promotions, organizerCount] = await Promise.all([
            getAvailableOneTimePromosForUser(user.id),
            prisma.eventOrganizer.count({ where: { userId: user.id } }),
        ]);
        return res.status(200).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name ?? null,
            email: user.email,
            birthday: user.birthday ? user.birthday.toISOString() : null,
            role: user.role,
            verified: user.verified,
            avatarUrl: user.avatarUrl ?? null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            points: user.points,
            lastLogin: user.lastLogin 
                ? new Date(user.lastLogin).toISOString() 
                : new Date(0).toISOString(),
            organizer: organizerCount > 0,
            promotions,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /users/me/password (Regular or higher)
router.patch('/me/password', authenticateToken, requireRole('regular'), async (req, res) => {
    const current = req.body?.old;
    const nextPwd = req.body?.new;
    if (typeof current !== 'string' || typeof nextPwd !== 'string') {
        return res.status(400).json({error: 'Both old and new passwords are required'});
    }
    if (!isValidPassword(nextPwd)) {
        return res.status(400).json({
            error: 'Password must be 8-20 chars with uppercase, lowercase, number, and special character'
        });
    }
    try {
        const me = await prisma.user.findUnique({where: {id: req.user.id}});
        if (!me) {
            return res.status(404).json({error: 'User not found'});
        }
        if (!me.passwordHash || !me.passwordHash.startsWith('$2b$')) {
            return res.status(403).json({error: 'Forbidden: current password is incorrect'});
        }
        const ok = await bcrypt.compare(current, me.passwordHash);
        if (!ok) {
            return res.status(403).json({error: 'Forbidden: current password is incorrect'});
        }
        const passwordHash = await bcrypt.hash(nextPwd, 10);
        await prisma.user.update({
            where: {id: me.id},
            data: {passwordHash},
        });
        return res.status(200).json({});
    } catch (err) {
        console.error('PATCH /users/me/password error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /users/:userId (Cashier or higher & Manager or higher)
router.get('/:userId', authenticateToken, requireRole('cashier'), async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({error: 'Invalid userId'});
    }
    try {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                utorid: true,
                name: true,
                email: true,
                birthday: true,
                role: true,
                verified: true,
                avatarUrl: true,
                createdAt: true,
                points: true,
                lastLogin: true,
            }, 
        });
        if (!user) return res.status(404).json({error: 'User not found'});
        const [promotions, organizerCount] = await Promise.all([
            getAvailableOneTimePromosForUser(userId),
            prisma.eventOrganizer.count({ where: { userId } }),
        ]);
        const isManagerPlus = (req.user.role.toLowerCase() === 'manager' || req.user.role.toLowerCase() === 'superuser');
        if (!isManagerPlus) {
            return res.json({
                id: user.id,
                utorid: user.utorid,
                name: user.name,
                points: user.points,
                verified: user.verified,
                promotions,
            });
        }
        return res.json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
            role: user.role,
            points: user.points,
            createdAt: user.createdAt.toISOString(),
            lastLogin: user.lastLogin 
                ? new Date(user.lastLogin).toISOString() 
                : new Date(0).toISOString(),
            verified: user.verified,
            avatarUrl: user.avatarUrl,
            organizer: organizerCount > 0,
            promotions,
        });
    } catch (err) {
        console.error('GET /users/:userId error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /users/:userId (Manager or higher)
router.patch('/:userId', authenticateToken, requireRole('manager'), async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({error: 'Invalid userId'});
    }
    let {email, verified, suspicious, role} = req.body;
    if (email === null) email = undefined;
    if (typeof verified === 'undefined' || verified === null) {
        verified = undefined;
    }
    if (typeof suspicious === 'undefined' || suspicious === null) {
        suspicious = undefined;
    }
    if (role === null) role = undefined;
    if (email !== undefined && !isValidUofTEmail(email)) {
        return res.status(400).json({ error: 'email must be a valid UofT address.' });
    }
    if (verified !== undefined && typeof verified !== 'boolean') {
        return res.status(400).json({error: 'verified must be a boolean'});
    }
    if (suspicious !== undefined && typeof suspicious !== 'boolean') {
        return res.status(400).json({error: 'suspicious must be a boolean'});
    }
    if (role !== undefined) {
        const allRoles = new Set(['regular', 'cashier', 'manager', 'superuser']);
        if (!allRoles.has(role)) {
            return res.status(400).json({error: 'Invalid role'});
        }
        if (req.user.role === 'manager' && role !== 'regular' && role !== 'cashier') {
            return res.status(403).json({error: 'Managers can only set role to regular or cashier'});
        }
    }
    try {
        const existing = await prisma.user.findUnique({where: {id: userId}});
        if (!existing) {
            return res.status(404).json({error: 'User not found'});
        }
        if (role === 'cashier' && existing.suspicious) {
            return res.status(400).json({error: 'Cannot promote a suspicious user to cashier.'});
        }
        const data = {};
        if (email !== undefined) data.email = email;
        if (verified !== undefined) data.verified = verified;
        if (suspicious !== undefined) data.suspicious = suspicious;
        if (role !== undefined) data.role = role;
        if (Object.keys(data).length === 0) {
            return res.status(400).json({error: 'No valid fields to update'});
        }
        const updated = await prisma.user.update({where: {id: userId}, data});
        const out = {id: updated.id, utorid: updated.utorid, name: updated.name};
        if (email !== undefined) out.email = updated.email;
        if (verified !== undefined) out.verified = updated.verified;
        if (suspicious !== undefined) out.suspicious = updated.suspicious;
        if (role !== undefined) out.role = updated.role;
        return res.json(out);
    } catch (err) {
        console.error('PATCH /users/:userId error:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
