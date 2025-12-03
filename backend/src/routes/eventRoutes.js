// Handle all endpoints start with /events
'use strict';

import express from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { isValidUtorid } from '../helpers/validation.js';
import { isManager, parseISO, toBool, 
    isManagerOrHigher, isOrganizer, listShapeForRegular, 
    listShapeForManager} from '../helpers/clearance.js';

const router = express.Router();

// POST for /events (Manager or higher)
router.post('/events', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const {name, description, location, startTime, endTime, capacity, points} = req.body;
        if (!name || !description || !location) {
            return res.status(400).json({error: 'name, description, location are required.'});
        }
        const s = parseISO(startTime);
        const e = parseISO(endTime);
        if (!s || !e || e <= s) {
            return res.status(400).json({error: 'startTime/endTime must be ISO strings; endTime after startTime.'});
        }
        if (capacity !== undefined && capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
            return res.status(400).json({error: 'capacity must be a positive integer or null.'});
        }
        if (!Number.isInteger(points) || points <= 0) {
            return res.status(400).json({error: 'points must be a positive integer.'});
        }
        const created = await prisma.event.create({
            data: {
                name, 
                description, 
                location,
                startTime: s,
                endTime: e,
                capacity: capacity ?? null,
                pointsTotal: points,
                pointsRemain: points,
            }
        });
        return res.status(201).json({
            id: created.id,
            name: created.name,
            description: created.description,
            location: created.location,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
            capacity: created.capacity,
            pointsRemain: created.pointsRemain,
            pointsAwarded: created.pointsAwarded,
            published: created.published,
            organizers: [],
            guests: [],
        });
    } catch (err) {
        console.error('Create event error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET for /events (Regular or higher & Manager or higher)
router.get('/events', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const {name, location, started, ended, showFull, page = '1', limit = '10', published} = req.query;
        const p = Number(page);
        const l = Number(limit);
        if (!Number.isInteger(p) || p <= 0) {
            return res.status(400).json({error: 'page must be a positive integer'});
        }
        if (!Number.isInteger(l) || l <= 0 || l > 100) {
            return res.status(400).json({error: 'limit must be between 1 and 100'});
        }
        const now = new Date();
        const where = {};
        if (name) {
            where.name = {contains: String(name), mode: 'insensitive'};
        }
        if (location) {
            where.location = {contains: String(location), mode: 'insensitive'};
        }
        if (!isManager(req.user)) {
            where.published = true;
        } else if (published !== undefined) {
            where.published = toBool(published);
        }
        if (started !== undefined) {
            where.startTime = toBool(started) ? {lte: now} : {gt: now};
        }
        if (ended !== undefined) {
            where.endTime = toBool(ended) ? {lte: now} : {gt: now};
        }
        const raw = await prisma.event.findMany({
            where,
            orderBy: {id: 'asc'},
            include: {_count: {select: {guests: true}}},
        });
        let filtered = raw;
        if (showFull !== undefined) {
            const wantFull = toBool(showFull);
            filtered = raw.filter(ev => {
                const numGuests = ev._count.guests;
                const isFull = ev.capacity != null && numGuests >= ev.capacity;
                return wantFull ? isFull : !isFull;
            });
        }
        const total = filtered.length;
        const sliced = filtered.slice((p - 1) * l, p * l);
        const results = sliced.map(ev => {
            const numGuests = ev._count.guests;
            return isManager(req.user) 
                ? listShapeForManager(ev, numGuests) 
                : listShapeForRegular(ev, numGuests);
        });
        return res.status(200).json({count: total, results});
    } catch (err) {
        console.error('List events error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET /organizer/events (Regular users assigned as organizers)
router.get('/organizer/events', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const { name, location, page = '1', limit = '10' } = req.query;
        const p = Number(page);
        const l = Number(limit);
        if (!Number.isInteger(p) || p <= 0) {
            return res.status(400).json({ error: 'page must be a positive integer' });
        }
        if (!Number.isInteger(l) || l <= 0 || l > 100) {
            return res.status(400).json({ error: 'limit must be between 1 and 100' });
        }
        const manager = isManager(req.user);
        if (!manager) {
            const assignments = await prisma.eventOrganizer.count({
                where: { userId: req.user.id },
            });
            if (assignments === 0) {
                return res.status(403).json({ error: 'Not assigned as an organizer.' });
            }
        }

        const where = {
            organizers: { some: { userId: req.user.id } },
        };
        if (name) {
            where.name = { contains: String(name), mode: 'insensitive' };
        }
        if (location) {
            where.location = { contains: String(location), mode: 'insensitive' };
        }
        const [count, events] = await Promise.all([
            prisma.event.count({ where }),
            prisma.event.findMany({
                where,
                orderBy: { startTime: 'asc' },
                skip: (p - 1) * l,
                take: l,
                include: { _count: { select: { guests: true } } },
            }),
        ]);
        const results = events.map((ev) =>
            listShapeForManager(ev, ev._count.guests)
        );
        return res.status(200).json({ count, results });
    } catch (err) {
        console.error('Organizer events error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET for /events/:eventId (Regular or higher & Manager or higher, or an organizer for this event)
router.get('/events/:eventId', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const ev = await prisma.event.findUnique({
            where: {id},
            include: {
                organizers: {include: {user: true}},
                guests: {include: {user: true}},
                _count: {select: {guests: true}},
            },
        });
        if (!ev) {
            return res.status(404).json({error: 'Event not found.'});
        }
        const organizerIds = ev.organizers.map(o => o.userId);
        const userIsOrganizer = organizerIds.includes(req.user.id);
        const canSeeFull = isManager(req.user) || userIsOrganizer;
        if (!ev.published && !canSeeFull) {
            return res.status(404).json({error: 'Event not found.'});
        }
        const base = {
            id: ev.id,
            name: ev.name,
            description: ev.description,
            location: ev.location,
            startTime: ev.startTime.toISOString(),
            endTime: ev.endTime.toISOString(),
            capacity: ev.capacity,
            organizers: ev.organizers.map(o => ({
                id: o.user.id, utorid: o.user.utorid, name: o.user.name ?? null,
            })),
            numGuests: ev._count.guests,
        };
        if (canSeeFull) {
            return res.json({
                ...base,
                pointsRemain: ev.pointsRemain,
                pointsAwarded: ev.pointsAwarded,
                published: ev.published,
                guests: ev.guests.map(g => ({
                    id: g.user.id, utorid: g.user.utorid, name: g.user.name ?? null,
                })),
            });
        } else {
            return res.json(base);
        }
    } catch (err) {
        console.error('Get event error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// PATCH for /events/:eventId (Manager or higher, or an organizer for this event)
router.patch('/events/:eventId', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const original = await prisma.event.findUnique({
            where: {id},
            include: {_count: {select: {guests: true}}},
        });
        if (!original) {
            return res.status(404).json({error: 'Event not found.'});
        }
        const userIsOrganizer = await isOrganizer(id, req.user.id);
        const canEdit = isManager(req.user) || userIsOrganizer;
        if (!canEdit) {
            return res.status(403).json({error: 'Forbidden.'});
        }
        const now = new Date();
        const body = req.body ?? {};
        if ((body.points !== undefined || body.published !== undefined) && !isManager(req.user)) {
            return res.status(403).json({error: 'Only managers may update points/published.'});
        }
        if (body.published !== undefined) {
            if (!isManager(req.user)) {
                return res.status(403).json({ error: 'Only managers may change published.' });
            }
            if (body.published === null) {}
            else if (body.published !== true) {
                return res.status(400).json({ error: 'published can only be set to true.' });
            }
        }
        const changingBasic = ['name','description','location','startTime','capacity'].some(k => body[k] !== undefined);
        if (changingBasic && now >= original.startTime) {
            return res.status(400).json({error: 'Cannot update name/description/location/startTime/capacity after original start time.'});
        }
        if (body.endTime !== undefined && now >= original.endTime) {
            return res.status(400).json({error: 'Cannot update endTime after original end time.'});
        }
        const data = {};
        const assignIfValid = (key, value) => {
            if (value === undefined || value === null) return;
            data[key] = value;
        };
        if (typeof body.name === 'string' && body.name.trim().length > 0) {
            data.name = body.name.trim();
        }
        if (typeof body.description === 'string') {
            data.description = body.description;
        }
        if (typeof body.location === 'string' && body.location.trim().length > 0) {
            data.location = body.location.trim();
        }
        if (typeof body.startTime === 'string') {
            const s = parseISO(body.startTime);
            if (!s) return res.status(400).json({ error: 'startTime must be ISO 8601 string.' });
            assignIfValid('startTime', s);
        }
        if (typeof body.endTime === 'string') {
            const e = parseISO(body.endTime);
            if (!e) return res.status(400).json({ error: 'endTime must be ISO 8601 string.' });
            if ((data.startTime ?? original.startTime) >= e)
                return res.status(400).json({ error: 'endTime must be after startTime.' });
            assignIfValid('endTime', e);
        }
        if (Number.isInteger(body.capacity) && body.capacity > 0) {
            if (original._count.guests > body.capacity)
                return res.status(400).json({ error: 'capacity cannot be reduced below current guests.' });
            assignIfValid('capacity', body.capacity);
        }
        if (Number.isInteger(body.points) && body.points > 0) {
            const newTotal = body.points;
            const newRemain = newTotal - original.pointsAwarded;
            if (newRemain < 0)
                return res.status(400).json({ error: 'Reducing points would make remaining points negative.' });
            data.pointsTotal = newTotal;
            data.pointsRemain = newRemain;
        }
        if (body.published === true) {
            assignIfValid('published', true);
        }
        const updated = await prisma.event.update({where: {id}, data});
        const resp = {
            id: updated.id,
            name: updated.name,
            location: updated.location,
            published: updated.published,
        };
        ['description','startTime','endTime','capacity'].forEach(k => {
            if (body[k] !== undefined) {
                resp[k] = k.endsWith('Time') ? updated[k].toISOString() : updated[k];
            }
        });
        if (body.points !== undefined) {
            resp.points = updated.pointsTotal;
        }
        if (body.published !== undefined) {
            resp.published = updated.published;
        }
        return res.json(resp);
    } catch (err) {
        console.error('Patch event error:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// DELETE for /events/:eventId (Manager or higher)
router.delete('/events/:eventId', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isInteger(id)) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const ev = await prisma.event.findUnique({where: {id}});
        if (!ev) {
            return res.status(404).json({error: 'Event not found.'});
        }
        if (ev.published) {
            return res.status(400).json({error: 'Cannot delete a published event.'});
        }
        await prisma.eventGuest.deleteMany({where: {eventId: id}});
        await prisma.eventOrganizer.deleteMany({where: {eventId: id}});
        await prisma.event.delete({where: {id}});
        return res.status(204).send();
    } catch (err) {
        console.error('Delete event error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST for /events/:eventId/organizers (Manager or higher)
router.post('/events/:eventId/organizers', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const {utorid} = req.body ?? {};
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        if (!isValidUtorid(utorid)) {
            return res.status(400).json({error: 'utorid must be 7-8 alphanumeric characters.'});
        }
        const event = await prisma.event.findUnique({
            where: {id: eventId},
            select: {id: true, name: true, location: true, endTime: true},
        });
        if (!event) {
            return res.status(404).json({error: 'Event not found.'});
        }
        if (new Date(event.endTime) <= new Date()) {
            return res.status(410).json({error: 'Event has ended.'});
        }
        const user = await prisma.user.findUnique({
            where: {utorid},
            select: {id: true, utorid: true, name: true},
        });
        if (!user) {
            return res.status(404).json({error: 'User must have an account.'});
        }
        const asGuest = await prisma.eventGuest.findUnique({
            where: {eventId_userId: {eventId, userId: user.id}},
        });
        if (asGuest) {
            return res.status(400).json({error: 'User is already a guest; remove as guest first.'});
        }
        await prisma.eventOrganizer.upsert({
            where: {eventId_userId: {eventId, userId: user.id}},
            update: {}, // If it exists, don’t change anything
            create: {eventId, userId: user.id}, // Otherwise, create it
        });
        const updated = await prisma.event.findUnique({
            where: {id: eventId},
            select: {
                id: true,
                name: true,
                location: true,
                organizers: {
                    include: {user: {select: {id: true, utorid: true, name: true}}},
                    orderBy: {user: {utorid: 'asc'}},
                },
            },
        });
        return res.status(201).json({
            id: updated.id,
            name: updated.name,
            location: updated.location,
            organizers: updated.organizers.map(o => ({
                id: o.user.id,
                utorid: o.user.utorid,
                name: o.user.name ?? null,
            })),
        });
    } catch (err) {
        console.error('POST /events/:eventId/organizers failed:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// DELETE for /events/:eventId/organizers/:userId (Manager or higher)
router.delete('/events/:eventId/organizers/:userId', authenticateToken, requireRole('manager'), async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const userId  = Number(req.params.userId);
        if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(userId)  || userId  <= 0) {
            return res.status(400).json({error: 'Invalid eventId or userId.'});
        }
        await prisma.eventOrganizer.deleteMany({where: {eventId, userId}});
        return res.status(204).send();
    } catch (err) {
        console.error('DELETE /events/:eventId/organizers/:userId failed:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// POST for /events/:eventId/guests (Manager or higher, or an organizer for this event)
router.post('/events/:eventId/guests', authenticateToken, async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const {utorid} = req.body ?? {};
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        if (!isValidUtorid(utorid)) {
            return res.status(400).json({error: 'utorid must be 7-8 alphanumeric characters.'});
        }
        const event = await prisma.event.findUnique({
            where: {id: eventId},
            select: {
                id: true, 
                name: true, 
                location: true,
                published: true, 
                endTime: true, 
                capacity: true
            },
        });
        if (!event) {
            return res.status(404).json({error: 'Event not found.'});
        }
        const manager = isManagerOrHigher(req.user.role);
        let organizer = false;
        if (!manager) {
            const link = await prisma.eventOrganizer.findUnique({
                where: {eventId_userId: {eventId, userId: req.user.id}},
            });
            organizer = !!link;
            if (!organizer) {
                return res.status(404).json({error: 'Event not found.'});
            }
        }
        if (new Date(event.endTime) <= new Date()) {
            return res.status(410).json({error: 'Event has ended.'});
        }
        const guestUser = await prisma.user.findUnique({
            where: {utorid},
            select: {id: true, utorid: true, name: true},
        });
        if (!guestUser) {
            return res.status(404).json({error: 'User not found.'});
        }
        const alreadyOrg = await prisma.eventOrganizer.findUnique({
            where: {eventId_userId: {eventId, userId: guestUser.id }},
        });
        if (alreadyOrg) {
            return res.status(400).json({error: 'User is already an organizer. Remove as organizer first.'});
        }
        const existingGuest = await prisma.eventGuest.findUnique({
            where: {eventId_userId: {eventId, userId: guestUser.id }},
        });
        if (existingGuest) {
            const numGuests = await prisma.eventGuest.count({ where: { eventId } });
            return res.status(200).json({
              id: event.id,
              name: event.name,
              location: event.location,
              guestAdded: {
                id: guestUser.id,
                utorid: guestUser.utorid,
                name: guestUser.name ?? null,
              },
              numGuests,
            });
          }      
        if (event.capacity !== null && event.capacity !== undefined) {
            const currentCount = await prisma.eventGuest.count({where: {eventId}});
            if (currentCount >= event.capacity) {
                return res.status(410).json({error: 'Event is full.'});
            }
        }
        await prisma.eventGuest.create({
            data: {eventId, userId: guestUser.id},
        });
        const numGuests = await prisma.eventGuest.count({where: {eventId}});
        return res.status(201).json({
            id: event.id,
            name: event.name,
            location: event.location,
            guestAdded: {
                id: guestUser.id,
                utorid: guestUser.utorid,
                name: guestUser.name ?? null,
            },
            numGuests,
        });
    } catch (err) {
        console.error('POST /events/:eventId/guests failed:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE for /events/:eventId/guests/me (Regular)
router.delete('/events/:eventId/guests/me', authenticateToken, async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const event = await prisma.event.findUnique({
            where: {id: eventId},
            select: {endTime: true, published: true},
        });
        if (!event || !event.published) {
            return res.status(404).json({error: 'Not found.'});
        }
        if (new Date(event.endTime) <= new Date()) {
            return res.status(410).json({error: 'Event has ended.'});
        }
        const del = await prisma.eventGuest.deleteMany({
            where: {eventId, userId: req.user.id},
        });
        if (del.count === 0) {
            return res.status(404).json({error: 'You did not RSVP to this event.'});
        }
        return res.status(204).send();
    } catch (err) {
        console.error('DELETE /events/:eventId/guests/me', err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// DELETE for /events/:eventId/guests/:userId (Manager or organizer for this event)
router.delete('/events/:eventId/guests/:userId', authenticateToken, requireRole('regular'), async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const userId  = Number(req.params.userId);
        if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({error: 'Invalid eventId or userId.'});
        }
        const manager = isManager(req.user);
        let organizer = false;
        if (!manager) {
            organizer = await isOrganizer(eventId, req.user.id);
            if (!organizer) {
                return res.status(404).json({error: 'Event not found.'});
            }
        }
        const deleted = await prisma.eventGuest.deleteMany({where: {eventId, userId}});
        if (deleted.count === 0) {
            return res.status(404).json({error: 'Guest not found.'});
        }
        return res.status(204).send();
    } catch (err) {
        console.error('DELETE /events/:eventId/guests/:userId failed:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

// POST for /events/:eventId/guests/me (Regular)
router.post('/events/:eventId/guests/me', authenticateToken, async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const event = await prisma.event.findUnique({
            where: {id: eventId},
            select: {id: true, name: true, location: true, endTime: true, capacity: true, published: true},
        });
        if (!event || !event.published) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        if (new Date(event.endTime) <= new Date()) {
            return res.status(410).json({error: 'Event has ended.'});
        }
        const existing = await prisma.eventGuest.findUnique({
            where: {eventId_userId: {eventId, userId: req.user.id}},
        });
        if (existing) {
            return res.status(400).json({error: 'Already on guest list.'});
        }
        if (event.capacity !== null && event.capacity !== undefined) {
            const count = await prisma.eventGuest.count({where: {eventId}});
            if (count >= event.capacity) {
                return res.status(410).json({error: 'Event is full.'});
            }
        }
        await prisma.eventGuest.create({data: {eventId, userId: req.user.id}});
        const numGuests = await prisma.eventGuest.count({where: {eventId}});
        const me = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {id: true, utorid: true, name: true},
        });
        return res.status(201).json({
            id: event.id,
            name: event.name,
            location: event.location,
            guestAdded: {id: me.id, utorid: me.utorid, name: me.name ?? null},
            numGuests,
        });
    } catch (err) {
        console.error('POST /events/:eventId/guests/me', err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// POST for /events/:eventId/transactions (Manager or higher, or an organizer for this event)
router.post('/events/:eventId/transactions', authenticateToken, async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({error: 'Invalid eventId.'});
        }
        const {type, utorid, amount, remark} = req.body ?? {};
        if (type !== 'event') {
            return res.status(400).json({error: 'type must be "event".'});
        }
        const pts = Number(amount);
        if (!Number.isInteger(pts) || pts <= 0) {
            return res.status(400).json({error: 'amount must be a positive integer'});
        }
        if (utorid !== undefined && (typeof utorid !== 'string' || !/^[A-Za-z0-9]{7,8}$/.test(utorid))) {
            return res.status(400).json({error: 'utorid must be 7-8 alphanumeric characters.'});
        }
        const ev = await prisma.event.findUnique({
            where: {id: eventId},
            select: {id: true, pointsRemain: true, pointsAwarded: true},
        });
        if (!ev) {
            return res.status(404).json({error: 'Event not found.'});
        }
        const manager = isManager(req.user);
        if (!manager) {
            const org = await isOrganizer(eventId, req.user.id);
            if (!org) {
                return res.status(403).json({error: 'Forbidden.'});
            }
        }
        const creator = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {id: true, utorid: true},
        });
        if (typeof utorid === 'string' && utorid.trim().length > 0) {
            const recipient = await prisma.user.findUnique({
                where: {utorid},
                select: {id: true, utorid: true},
            });
            if (!recipient) {
                return res.status(400).json({error: 'User must have an account.'});
            }
            const isGuest = await prisma.eventGuest.findUnique({
                where: {eventId_userId: {eventId, userId: recipient.id}},
                select: {id: true},
            });
            if (!isGuest) {
                return res.status(400).json({error: 'User is not on the guest list for this event.'});
            }
            if (ev.pointsRemain < pts) {
                return res.status(400).json({error: 'Remaining points is less than requested amount.'});
            }
            const created = await prisma.$transaction(async (tx) => {
                const t = await tx.transaction.create({
                    data: {
                        userId: recipient.id,
                        type: 'event',
                        amount: pts,
                        relatedId: eventId,
                        remark: typeof remark === 'string' ? remark : '',
                        suspicious: false,
                        promotionIds: [],
                        createdById: creator.id,
                    },
                    select: {id: true},
                });
                await tx.user.update({
                    where: {id: recipient.id},
                    data: {points: {increment: pts}},
                });
                await tx.event.update({
                    where: {id: eventId},
                    data: {
                        pointsRemain: {decrement: pts},
                        pointsAwarded: {increment: pts},
                    },
                });
                return t.id;
            });
            return res.status(201).json({
                id: created,
                recipient: recipient.utorid,
                awarded: pts,
                type: 'event',
                relatedId: eventId,
                remark: typeof remark === 'string' ? remark : '',
                createdBy: creator?.utorid ?? null,
            });
        }
        const guests = await prisma.eventGuest.findMany({
            where: {eventId},
            select: {userId: true, user: {select: {utorid: true}}},
        });
        if (guests.length === 0) {
            return res.status(400).json({error: 'No guests to award for this event.'});
        }
        const totalNeeded = pts * guests.length;
        if (ev.pointsRemain < totalNeeded) {
            return res.status(400).json({error: 'Remaining points is less than requested amount.'});
        }
        const results = await prisma.$transaction(async (tx) => {
            await tx.user.updateMany({
                where: {id: {in: guests.map(g => g.userId)}},
                data: {points: {increment: pts}},
            });
            // Create one transaction per guest (we need IDs for the response)
            const out = [];
            for (const g of guests) {
                const row = await tx.transaction.create({
                    data: {
                        userId: g.userId,
                        type: 'event',
                        amount: pts,
                        relatedId: eventId,
                        remark: typeof remark === 'string' ? remark : '',
                        suspicious: false,
                        promotionIds: [],
                        createdById: creator.id,
                    },
                    select: {id: true},
                });
                out.push({
                    id: row.id,
                    recipient: g.user.utorid,
                    awarded: pts,
                    type: 'event',
                    relatedId: eventId,
                    remark: typeof remark === 'string' ? remark : '',
                    createdBy: creator?.utorid ?? null,
                });
            }
            await tx.event.update({
                where: {id: eventId},
                data: {
                    pointsRemain: {decrement: totalNeeded},
                    pointsAwarded: {increment: totalNeeded},
                },
            });
            return out;
        });
        return res.status(201).json(results);
    } catch (err) {
        console.error('POST /events/:eventId/transactions failed:', err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

export default router;
