// Helper for clearance check & response format(according to different role)

export const isManager = (user) => ['manager', 'superuser'].includes(String(user.role).toLowerCase());

export const parseISO = (s) => {
    const d = new Date(s);
    return Number.isFinite(d.valueOf()) ? d : null;
}

export const toBool = (v) => (typeof v === 'string' ? v.toLowerCase() === 'true' : !!v);

export function isManagerOrHigher(role) {
    return role.toLowerCase() === 'manager' || role.toLowerCase() === 'superuser';
}

import prisma from '../db.js';

export async function isOrganizer(eventId, userId) {
    const rel = await prisma.eventOrganizer.findFirst({where: {eventId, userId}});
    return !!rel;
}

export function listShapeForRegular(ev, numGuests) {
    return {
        id: ev.id,
        name: ev.name,
        location: ev.location,
        startTime: ev.startTime.toISOString(),
        endTime: ev.endTime.toISOString(),
        capacity: ev.capacity,
        numGuests,
    };
}

export function listShapeForManager(ev, numGuests) {
    return {
        id: ev.id,
        name: ev.name,
        location: ev.location,
        startTime: ev.startTime.toISOString(),
        endTime: ev.endTime.toISOString(),
        capacity: ev.capacity,
        pointsRemain: ev.pointsRemain,
        pointsAwarded: ev.pointsAwarded,
        published: ev.published,
        numGuests,
    };
}
