/**
 * Seed script populating the dev SQLite database with demo data that satisfies
 * the CSC309 project rubric (10+ users, 30+ transactions, 5+ events/promotions).
 *
 * Run once with: `cd backend && node prisma/seed.js`
 */

import bcrypt from 'bcrypt';
import prisma from '../src/db.js';

const PASSWORD = process.env.SEED_PASSWORD || 'DevStrongPass!';

const dayFromNow = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
};

async function resetDatabase() {
    console.log('🧹 Clearing existing data …');
    await prisma.transaction.deleteMany();
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.event.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.user.deleteMany();
}

async function seedUsers() {
    console.log('👥 Creating demo users …');
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const seeds = [
        { utorid: 'super123',  role: 'superuser', name: 'Avery Super',   email: 'super123@utoronto.ca', points: 2400, verified: true },
        { utorid: 'manager01', role: 'manager',   name: 'Morgan Patel',  email: 'manager01@utoronto.ca', points: 1800, verified: true },
        { utorid: 'manager02', role: 'manager',   name: 'Devon Singh',   email: 'manager02@utoronto.ca', points: 1650, verified: true },
        { utorid: 'cashier01', role: 'cashier',   name: 'Casey Chen',    email: 'cashier01@utoronto.ca', points: 1200, verified: true },
        { utorid: 'cashier02', role: 'cashier',   name: 'Jamie Roy',     email: 'cashier02@utoronto.ca', points: 1100, verified: true },
        { utorid: 'organizer01', role: 'regular', name: 'Riley Organ',   email: 'organizer01@utoronto.ca', points: 900, verified: true },
        { utorid: 'organizer02', role: 'regular', name: 'Sky Soto',      email: 'organizer02@utoronto.ca', points: 820, verified: true },
        { utorid: 'loyal001', role: 'regular',    name: 'Leah White',    email: 'leah.white@utoronto.ca', points: 760, verified: true },
        { utorid: 'loyal002', role: 'regular',    name: 'Ezra Thornton', email: 'ezra.thornton@utoronto.ca', points: 710, verified: true },
        { utorid: 'loyal003', role: 'regular',    name: 'Priya Mehta',   email: 'priya.mehta@utoronto.ca', points: 690, verified: true },
        { utorid: 'loyal004', role: 'regular',    name: 'Nina Laurent',  email: 'nina.laurent@utoronto.ca', points: 640, verified: true },
        { utorid: 'loyal005', role: 'regular',    name: 'Omar Farley',   email: 'omar.farley@utoronto.ca', points: 600, verified: true },
        { utorid: 'loyal006', role: 'regular',    name: 'Hana Brooks',   email: 'hana.brooks@utoronto.ca', points: 560, verified: true },
        { utorid: 'suspect01', role: 'regular',   name: 'Quinn Vale',    email: 'quinn.vale@utoronto.ca', points: 420, verified: true, suspicious: true },
        { utorid: 'newbie01',  role: 'regular',   name: 'Kai Powell',    email: 'kai.powell@utoronto.ca', points: 220, verified: false },
    ];

    const map = {};
    for (const seed of seeds) {
        map[seed.utorid] = await prisma.user.create({
            data: {
                utorid: seed.utorid,
                email: seed.email,
                name: seed.name,
                passwordHash,
                role: seed.role,
                verified: seed.verified ?? true,
                suspicious: seed.suspicious ?? false,
                points: seed.points,
                lastLogin: new Date(),
            },
        });
    }
    return map;
}

async function seedPromotions() {
    console.log('🏷️  Creating promotions …');
    const promos = [
        {
            name: 'Campus Starter Pack',
            description: 'Earn 10% extra points on all bookstore purchases.',
            type: 'automatic',
            startTime: dayFromNow(-60),
            endTime: dayFromNow(180),
            minSpending: 25,
            rate: 0.1,
        },
        {
            name: 'Blue & Gold Booster',
            description: '20% bonus on café tabs over $40.',
            type: 'automatic',
            startTime: dayFromNow(-15),
            endTime: dayFromNow(45),
            minSpending: 40,
            rate: 0.2,
        },
        {
            name: 'Frosh Surprise',
            description: 'Redeem one-time 300 pts when you spend $50.',
            type: 'onetime',
            startTime: dayFromNow(-5),
            endTime: dayFromNow(60),
            minSpending: 50,
            points: 300,
        },
        {
            name: 'Exam Week Double',
            description: 'Automatic double points during exams.',
            type: 'automatic',
            startTime: dayFromNow(-7),
            endTime: dayFromNow(14),
            rate: 1.0,
        },
        {
            name: 'Weekend Treat',
            description: 'Single-use 150 points for weekend visits.',
            type: 'onetime',
            startTime: dayFromNow(-2),
            endTime: dayFromNow(21),
            points: 150,
        },
    ];
    const records = [];
    for (const promo of promos) {
        records.push(await prisma.promotion.create({ data: promo }));
    }
    return records;
}

async function seedEvents(userMap) {
    console.log('📅 Creating events + organizers …');
    const events = [
        {
            key: 'aurora',
            name: 'Aurora Gala',
            description: 'Formal appreciation night with live jazz for high spenders.',
            location: 'Hart House Great Hall',
            startTime: dayFromNow(-5),
            endTime: dayFromNow(-5 + 1),
            capacity: 120,
            pointsTotal: 1500,
            published: true,
            organizers: ['organizer01', 'manager01'],
            guests: ['loyal001', 'loyal002', 'loyal003'],
            awards: [
                { utorid: 'loyal001', amount: 40, remark: 'Volunteer shift' },
                { utorid: 'loyal002', amount: 30, remark: 'Stage help' },
            ],
        },
        {
            key: 'tech-expo',
            name: 'Campus Tech Expo',
            description: 'Showcase of Toronto start-ups with live demos.',
            location: 'Bahen Centre Atrium',
            startTime: dayFromNow(3),
            endTime: dayFromNow(4),
            capacity: 200,
            pointsTotal: 2000,
            published: true,
            organizers: ['organizer01'],
            guests: ['loyal004', 'loyal005', 'loyal006'],
            awards: [
                { utorid: 'loyal005', amount: 25, remark: 'Workshop host' },
            ],
        },
        {
            key: 'wellness-retreat',
            name: 'Wellness Retreat',
            description: 'Mindfulness pop-up with yoga and tea.',
            location: 'Sid Smith Quad',
            startTime: dayFromNow(10),
            endTime: dayFromNow(10.5),
            capacity: 80,
            pointsTotal: 1000,
            published: true,
            organizers: ['organizer02'],
            guests: ['loyal002', 'loyal004', 'loyal006'],
            awards: [],
        },
        {
            key: 'winter-drive',
            name: 'Winter Charity Drive',
            description: 'Donation-matching event raising funds for shelters.',
            location: 'Robarts Commons',
            startTime: dayFromNow(-12),
            endTime: dayFromNow(-11.5),
            capacity: 300,
            pointsTotal: 2500,
            published: true,
            organizers: ['manager02'],
            guests: ['loyal001', 'loyal005', 'suspect01'],
            awards: [
                { utorid: 'loyal001', amount: 60, remark: 'Donation lead' },
            ],
        },
        {
            key: 'coffee-series',
            name: 'Coffee Chat Series',
            description: 'Intimate networking chats with alumni.',
            location: 'Innis Cafe',
            startTime: dayFromNow(1),
            endTime: dayFromNow(1.5),
            capacity: 40,
            pointsTotal: 600,
            published: true,
            organizers: ['organizer02'],
            guests: ['loyal003', 'loyal004', 'loyal006'],
            awards: [],
        },
    ];

    const map = {};
    for (const event of events) {
        const created = await prisma.event.create({
            data: {
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsTotal: event.pointsTotal,
                pointsRemain: event.pointsTotal,
                published: event.published,
            },
        });
        map[event.key] = created;

        if (event.organizers?.length) {
            await prisma.eventOrganizer.createMany({
                data: event.organizers.map((utorid) => ({
                    eventId: created.id,
                    userId: userMap[utorid].id,
                })),
            });
        }

        if (event.guests?.length) {
            await prisma.eventGuest.createMany({
                data: event.guests.map((utorid) => ({
                    eventId: created.id,
                    userId: userMap[utorid].id,
                })),
            });
        }

        if (event.awards?.length) {
            for (const award of event.awards) {
                const creator = userMap[event.organizers[0]];
                await prisma.transaction.create({
                    data: {
                        userId: userMap[award.utorid].id,
                        type: 'event',
                        amount: award.amount,
                        relatedId: created.id,
                        remark: award.remark ?? '',
                        suspicious: false,
                        promotionIds: [],
                        createdById: creator.id,
                    },
                });
                await prisma.user.update({
                    where: { id: userMap[award.utorid].id },
                    data: { points: { increment: award.amount } },
                });
                await prisma.event.update({
                    where: { id: created.id },
                    data: {
                        pointsRemain: { decrement: award.amount },
                        pointsAwarded: { increment: award.amount },
                    },
                });
            }
        }
    }
    return map;
}

async function seedTransactions(userMap, promotions) {
    console.log('💳 Creating transactions …');
    const cashier = userMap['cashier01'];
    const manager = userMap['manager01'];

    const promoIds = {
        starter: promotions.find((p) => p.name === 'Campus Starter Pack')?.id,
        onetime: promotions.find((p) => p.type === 'onetime')?.id,
    };

    const regulars = ['loyal001', 'loyal002', 'loyal003', 'loyal004', 'loyal005', 'loyal006'];

    const purchaseTxIds = [];
    for (let i = 0; i < regulars.length; i++) {
        const utorid = regulars[i];
        const amount = 40 + i * 5;
        const tx = await prisma.transaction.create({
            data: {
                userId: userMap[utorid].id,
                type: 'purchase',
                amount,
                spent: 20 + i * 10,
                remark: 'Campus purchase',
                promotionIds: i % 2 === 0 && promoIds.starter ? [promoIds.starter] : [],
                suspicious: false,
                createdById: cashier.id,
            },
        });
        purchaseTxIds.push(tx.id);
        await prisma.user.update({
            where: { id: userMap[utorid].id },
            data: { points: { increment: amount } },
        });
    }

    const redemptionTargets = ['loyal001', 'loyal003', 'loyal005'];
    for (const utorid of redemptionTargets) {
        const redeem = 80;
        await prisma.transaction.create({
            data: {
                userId: userMap[utorid].id,
                type: 'redemption',
                amount: -redeem,
                redeemed: redeem,
                remark: 'Merch redemption',
                promotionIds: [],
                createdById: userMap[utorid].id,
                processedById: cashier.id,
            },
        });
        await prisma.user.update({
            where: { id: userMap[utorid].id },
            data: { points: { decrement: redeem } },
        });
    }

    for (let i = 0; i < 3; i++) {
        const utorid = regulars[i];
        await prisma.transaction.create({
            data: {
                userId: userMap[utorid].id,
                type: 'adjustment',
                amount: 25,
                relatedId: purchaseTxIds[i],
                remark: 'Manual bonus',
                promotionIds: [],
                suspicious: false,
                createdById: manager.id,
            },
        });
        await prisma.user.update({
            where: { id: userMap[utorid].id },
            data: { points: { increment: 25 } },
        });
    }

    const transfers = [
        ['loyal002', 'loyal004', 30],
        ['loyal003', 'loyal006', 45],
        ['loyal005', 'organizer01', 20],
    ];
    for (const [senderKey, recipientKey, amount] of transfers) {
        await prisma.transaction.create({
            data: {
                userId: userMap[senderKey].id,
                type: 'transfer',
                amount: -amount,
                relatedId: userMap[recipientKey].id,
                remark: 'Shared purchase',
                promotionIds: [],
                createdById: userMap[senderKey].id,
            },
        });
        await prisma.transaction.create({
            data: {
                userId: userMap[recipientKey].id,
                type: 'transfer',
                amount,
                relatedId: userMap[senderKey].id,
                remark: 'Shared purchase',
                promotionIds: [],
                createdById: userMap[senderKey].id,
            },
        });
        await prisma.user.update({
            where: { id: userMap[senderKey].id },
            data: { points: { decrement: amount } },
        });
        await prisma.user.update({
            where: { id: userMap[recipientKey].id },
            data: { points: { increment: amount } },
        });
    }

    // Event-wide award to ensure organizer portal has recent activity.
    const techExpo = await prisma.event.findFirst({ where: { name: 'Campus Tech Expo' } });
    if (techExpo) {
        const guests = await prisma.eventGuest.findMany({
            where: { eventId: techExpo.id },
            include: { user: true },
        });
        for (const guest of guests) {
            await prisma.transaction.create({
                data: {
                    userId: guest.userId,
                    type: 'event',
                    amount: 15,
                    relatedId: techExpo.id,
                    remark: 'Pre-event check-in',
                    suspicious: false,
                    promotionIds: [],
                    createdById: userMap['organizer01'].id,
                },
            });
        }
        await prisma.user.updateMany({
            where: { id: { in: guests.map((g) => g.userId) } },
            data: { points: { increment: 15 } },
        });
        await prisma.event.update({
            where: { id: techExpo.id },
            data: {
                pointsRemain: { decrement: 15 * guests.length },
                pointsAwarded: { increment: 15 * guests.length },
            },
        });
    }
}

async function main() {
    await resetDatabase();
    const users = await seedUsers();
    const promotions = await seedPromotions();
    await seedEvents(users);
    await seedTransactions(users, promotions);
    console.log('✅ Seed completed. Demo password:', PASSWORD);
}

main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
