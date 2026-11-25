import 'dotenv/config';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';

// ---- Safety: sirf alag test database par chalao ----
const testUri = process.env.MONGO_URI_TEST;
if (!testUri) {
  throw new Error('MONGO_URI_TEST is missing in .env (use a separate database like service_flow_test)');
}
const dbName = new URL(testUri).pathname.replace('/', '');
if (!dbName.toLowerCase().includes('test')) {
  throw new Error(`Refusing to run tests on database "${dbName}". The name must contain "test".`);
}

// env set hone ke baad import (taake app test mode mein load ho)
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/User.js');
const { default: Business } = await import('../src/models/Business.js');
const { default: BusinessMember } = await import('../src/models/BusinessMember.js');
const { default: PasswordReset } = await import('../src/models/PasswordReset.js');
const { default: Service } = await import('../src/models/Service.js');
const { default: Staff } = await import('../src/models/Staff.js');
const { default: Invitation } = await import('../src/models/Invitation.js');
const { default: StaffSchedule } = await import('../src/models/StaffSchedule.js');

const PASSWORD = 'Test1234';
const NEW_PASSWORD = 'NewPass5678';
const user = (n) => ({ name: `User ${n}`, email: `${n}@test.com`, password: PASSWORD });
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clean = async () => {
  await Promise.all([
    User.deleteMany({}),
    Business.deleteMany({}),
    BusinessMember.deleteMany({}),
    PasswordReset.deleteMany({}),
    Service.deleteMany({}),
    Staff.deleteMany({}),
    Invitation.deleteMany({}),
    StaffSchedule.deleteMany({}),
  ]);
};

describe('ServiceFlow: auth, roles, business setup and tenant isolation', () => {
  const agentA = request.agent(app); // Business A ka owner
  const agentB = request.agent(app); // Business B ka owner
  const agentC = request.agent(app); // baad mein receptionist banega (apne business C mein)
  const recAgent = request.agent(app); // invitation se bana receptionist (Business A mein)

  let bizA;
  let bizB;
  let serviceAId;
  let scanId;
  let staffAId;
  let staffBId;
  let nurseId;
  let svcFollowUpId;
  let inviteToken;
  let staffInviteToken;
  let leaveId;

  const tokenFrom = (link) => new URL(link).searchParams.get('token');
  const dayPlus = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const validHours = () =>
    [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      isOpen: day !== 0 && day !== 6,
      open: '10:00',
      close: '19:00',
      breaks: day === 1 ? [{ start: '13:00', end: '14:00' }] : [],
    }));

  before(async () => {
    await mongoose.connect(testUri);
    await Promise.all([
      User.init(),
      Business.init(),
      BusinessMember.init(),
      PasswordReset.init(),
      Service.init(),
      Staff.init(),
      Invitation.init(),
      StaffSchedule.init(),
    ]);
    await clean();
  });

  after(async () => {
    await clean();
    await mongoose.disconnect();
  });

  // ============================================================
  // REGISTER
  // ============================================================
  test('register rejects invalid input with field errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'abc', password: '123' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.name);
    assert.ok(res.body.errors.email);
    assert.ok(res.body.errors.password);

    const noNumber = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sara', email: 's@test.com', password: 'abcdefgh' });
    assert.equal(noNumber.status, 400);
  });

  test('register creates user, business and owner membership (no auto-login)', async () => {
    for (const n of ['a', 'b', 'c']) {
      const res = await request(app).post('/api/auth/register').send(user(n));
      assert.equal(res.status, 201);
      assert.equal(res.body.data.role, 'owner');
      assert.equal(res.headers['set-cookie'], undefined);
      assert.ok(!JSON.stringify(res.body).includes('passwordHash'));
    }

    const a = await User.findOne({ email: 'a@test.com' }).select('+passwordHash');
    assert.notEqual(a.passwordHash, PASSWORD);
    assert.ok(a.passwordHash.startsWith('$2'));
    const member = await BusinessMember.findOne({ userId: a._id });
    assert.equal(member.role, 'owner');
    assert.equal(member.status, 'active');
  });

  test('register blocks duplicate email (case-insensitive)', async () => {
    const same = await request(app).post('/api/auth/register').send(user('a'));
    assert.equal(same.status, 409);

    const upper = await request(app)
      .post('/api/auth/register')
      .send({ ...user('a'), email: 'A@TEST.com' });
    assert.equal(upper.status, 409);
  });

  // ============================================================
  // LOGIN / SESSION
  // ============================================================
  test('me requires login', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('wrong password and unknown email give the same message', async () => {
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'WrongPass1' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: PASSWORD });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  test('login sets httpOnly cookies and me returns user, business and role', async () => {
    const res = await agentA.post('/api/auth/login').send({ email: 'a@test.com', password: PASSWORD });
    assert.equal(res.status, 200);
    const cookies = res.headers['set-cookie'];
    assert.equal(cookies.length, 2);
    assert.ok(cookies.every((c) => /HttpOnly/i.test(c)));
    bizA = res.body.data.business.id;

    const resB = await agentB.post('/api/auth/login').send({ email: 'b@test.com', password: PASSWORD });
    assert.equal(resB.status, 200);
    bizB = resB.body.data.business.id;
    assert.notEqual(bizA, bizB);

    const me = await agentA.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, 'a@test.com');
    assert.equal(me.body.data.role, 'owner');
    assert.ok(!JSON.stringify(me.body).includes('passwordHash'));
  });

  test('refresh issues a new session', async () => {
    const res = await agentA.post('/api/auth/refresh');
    assert.equal(res.status, 200);
    const me = await agentA.get('/api/auth/me');
    assert.equal(me.status, 200);
  });

  // ============================================================
  // SETUP: aik receptionist (user C apne business mein)
  // ============================================================
  test('a second user can be given the receptionist role and logs in', async () => {
    const c = await User.findOne({ email: 'c@test.com' });
    await BusinessMember.updateOne({ userId: c._id }, { role: 'receptionist' });

    const login = await agentC.post('/api/auth/login').send({ email: 'c@test.com', password: PASSWORD });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.role, 'receptionist');
  });

  // ============================================================
  // FORGOT / RESET PASSWORD
  // ============================================================
  test('forgot-password never reveals whether an email exists', async () => {
    const before = await PasswordReset.countDocuments();

    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'a@test.com' });
    const afterKnown = await PasswordReset.countDocuments();
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.com' });
    const afterUnknown = await PasswordReset.countDocuments();

    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message);
    assert.equal(afterKnown, before + 1);
    assert.equal(afterUnknown, afterKnown);

    const bad = await request(app).post('/api/auth/forgot-password').send({ email: 'abc' });
    assert.equal(bad.status, 400);
  });

  test('reset-password is single-use, expires, and kills old sessions', async () => {
    const a = await User.findOne({ email: 'a@test.com' });
    await PasswordReset.deleteMany({ userId: a._id });

    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      userId: a._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await sleep(1100); // taake purana session "stale" gina jaye

    const fake = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'f'.repeat(64), password: NEW_PASSWORD });
    assert.equal(fake.status, 400);

    const weak = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'abcdefgh' });
    assert.equal(weak.status, 400);

    const ok = await request(app).post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    assert.equal(ok.status, 200);

    const reuse = await request(app).post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    assert.equal(reuse.status, 400);

    const expiredToken = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      userId: a._id,
      tokenHash: hashToken(expiredToken),
      expiresAt: new Date(Date.now() - 1000),
    });
    const expired = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: expiredToken, password: NEW_PASSWORD });
    assert.equal(expired.status, 400);

    assert.equal((await agentA.get('/api/auth/me')).status, 401);
    assert.equal((await agentA.post('/api/auth/refresh')).status, 401);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: PASSWORD });
    assert.equal(oldLogin.status, 401);
    const newLogin = await agentA.post('/api/auth/login').send({ email: 'a@test.com', password: NEW_PASSWORD });
    assert.equal(newLogin.status, 200);
  });

  // ============================================================
  // BUSINESS PROFILE AND SETTINGS
  // ============================================================
  test('business profile requires login', async () => {
    assert.equal((await request(app).get('/api/business')).status, 401);
  });

  test('owner can read the business profile', async () => {
    const res = await agentA.get('/api/business');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, bizA);
    assert.equal(res.body.data.currency, 'PKR');
    assert.equal(res.body.data.settings.slotIntervalMinutes, 30);
    assert.equal(res.body.data.ownerId, undefined);
  });

  test('owner can update profile, regional and booking settings', async () => {
    const res = await agentA.patch('/api/business').send({
      name: 'Clinic One',
      phone: '0300 1234567',
      timezone: 'Asia/Dubai',
      currency: 'AED',
      settings: { minLeadTimeHours: 4 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.phone, '0300-1234567');
    assert.equal(res.body.data.timezone, 'Asia/Dubai');
    assert.equal(res.body.data.settings.minLeadTimeHours, 4);
    assert.equal(res.body.data.settings.slotIntervalMinutes, 30);
    assert.equal(res.body.data.settings.defaultDurationMinutes, 30);

    const again = await agentA.get('/api/business');
    assert.equal(again.body.data.name, 'Clinic One');
  });

  test('invalid business values are rejected with field errors', async () => {
    const res = await agentA.patch('/api/business').send({
      phone: 'abc',
      slug: 'Bad Slug!',
      timezone: 'Mars/Phobos',
      currency: 'XXX',
      settings: { slotIntervalMinutes: 7, bookingHorizonDays: 0 },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.phone);
    assert.ok(res.body.errors.slug);
    assert.ok(res.body.errors.timezone);
    assert.ok(res.body.errors.currency);
    assert.ok(res.body.errors['settings.slotIntervalMinutes']);
    assert.ok(res.body.errors['settings.bookingHorizonDays']);
  });

  test('protected business fields cannot be changed', async () => {
    const owner = await User.findOne({ email: 'a@test.com' });
    const res = await agentA.patch('/api/business').send({
      name: 'Clinic One',
      ownerId: new mongoose.Types.ObjectId().toString(),
      onboardingCompleted: true,
    });
    assert.equal(res.status, 200);
    const biz = await Business.findById(bizA);
    assert.equal(biz.ownerId.toString(), owner._id.toString());
    assert.equal(biz.onboardingCompleted, false);
  });

  test('an empty update is rejected', async () => {
    const res = await agentA.patch('/api/business').send({});
    assert.equal(res.status, 400);
  });

  test('booking link (slug) must be unique', async () => {
    const a = await agentA.patch('/api/business').send({ slug: 'clinic-one' });
    assert.equal(a.status, 200);

    const clash = await agentB.patch('/api/business').send({ slug: 'clinic-one' });
    assert.equal(clash.status, 409);
    assert.ok(clash.body.errors.slug);

    const own = await agentB.patch('/api/business').send({ slug: 'salon-one' });
    assert.equal(own.status, 200);
  });

  test('changing settings in business B never touches business A', async () => {
    const res = await agentB.patch('/api/business').send({ name: 'Salon One' });
    assert.equal(res.status, 200);
    assert.equal((await agentA.get('/api/business')).body.data.name, 'Clinic One');
    assert.equal((await agentB.get('/api/business')).body.data.name, 'Salon One');
  });

  test('receptionist can view but not edit the business', async () => {
    const c = await User.findOne({ email: 'c@test.com' });
    await BusinessMember.updateOne({ userId: c._id }, { role: 'receptionist', status: 'active' });
    assert.equal((await agentC.get('/api/business')).status, 200);
    assert.equal((await agentC.patch('/api/business').send({ name: 'Hacked' })).status, 403);
  });

  // ============================================================
  // OPENING HOURS, CLOSURES AND ONBOARDING
  // ============================================================
  test('a new business has default opening hours and no closures', async () => {
    const res = await agentB.get('/api/business');
    assert.equal(res.status, 200);
    const hours = res.body.data.openingHours;
    assert.equal(hours.length, 7);
    assert.equal(hours.find((d) => d.day === 0).isOpen, false);
    assert.equal(hours.find((d) => d.day === 1).open, '09:00');
    assert.deepEqual(res.body.data.closures, []);
    assert.equal(res.body.data.onboardingCompleted, false);
  });

  test('owner can save opening hours with breaks', async () => {
    const res = await agentA.put('/api/business/opening-hours').send({ openingHours: validHours() });
    assert.equal(res.status, 200);
    const monday = res.body.data.openingHours.find((d) => d.day === 1);
    assert.equal(monday.open, '10:00');
    assert.equal(monday.breaks.length, 1);
    assert.equal(res.body.data.openingHours.find((d) => d.day === 6).isOpen, false);

    const again = await agentA.get('/api/business');
    assert.equal(again.body.data.openingHours.find((d) => d.day === 1).close, '19:00');
  });

  test('invalid opening hours are rejected with field errors', async () => {
    const send = (mutate) => {
      const hours = validHours();
      mutate(hours);
      return agentA.put('/api/business/opening-hours').send({ openingHours: hours });
    };

    const closeBeforeOpen = await send((h) => {
      h[2].open = '18:00';
      h[2].close = '09:00';
    });
    assert.equal(closeBeforeOpen.status, 400);
    assert.ok(closeBeforeOpen.body.errors['openingHours.2.close']);

    const overlapping = await send((h) => {
      h[3].breaks = [
        { start: '12:00', end: '13:30' },
        { start: '13:00', end: '14:00' },
      ];
    });
    assert.equal(overlapping.status, 400);
    assert.ok(overlapping.body.errors['openingHours.3.breaks.1.end']);

    const breakAfterClose = await send((h) => {
      h[4].breaks = [{ start: '18:30', end: '19:30' }];
    });
    assert.equal(breakAfterClose.status, 400);
    assert.ok(breakAfterClose.body.errors['openingHours.4.breaks.0.end']);

    const badTime = await send((h) => {
      h[1].open = '25:00';
    });
    assert.equal(badTime.status, 400);
    assert.ok(badTime.body.errors['openingHours.1.open']);

    const fewDays = await agentA
      .put('/api/business/opening-hours')
      .send({ openingHours: validHours().slice(0, 3) });
    assert.equal(fewDays.status, 400);
    assert.ok(fewDays.body.errors.openingHours);
  });

  test("changing business A's hours does not change business B's hours", async () => {
    const res = await agentB.get('/api/business');
    assert.equal(res.body.data.openingHours.find((d) => d.day === 1).open, '09:00');
  });

  test('closures: add, duplicate, past date, bad date, remove, isolation', async () => {
    const future = dayPlus(10);

    const added = await agentA.post('/api/business/closures').send({ date: future, reason: 'Holiday' });
    assert.equal(added.status, 201);
    const closureId = added.body.data.id;

    const dup = await agentA.post('/api/business/closures').send({ date: future });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.errors.date);

    const past = await agentA.post('/api/business/closures').send({ date: '2020-01-01' });
    assert.equal(past.status, 400);
    assert.ok(past.body.errors.date);

    const bad = await agentA.post('/api/business/closures').send({ date: '2026-02-31' });
    assert.equal(bad.status, 400);

    const list = await agentA.get('/api/business');
    assert.equal(list.body.data.closures.length, 1);
    assert.equal(list.body.data.closures[0].reason, 'Holiday');

    const foreign = await agentB.delete(`/api/business/closures/${closureId}`);
    assert.equal(foreign.status, 404);
    assert.equal((await agentA.get('/api/business')).body.data.closures.length, 1);

    const removed = await agentA.delete(`/api/business/closures/${closureId}`);
    assert.equal(removed.status, 200);
    const again = await agentA.delete(`/api/business/closures/${closureId}`);
    assert.equal(again.status, 404);
  });

  test('receptionist cannot change hours, closures or complete onboarding', async () => {
    assert.equal(
      (await agentC.put('/api/business/opening-hours').send({ openingHours: validHours() })).status,
      403
    );
    assert.equal((await agentC.post('/api/business/closures').send({ date: '2030-01-01' })).status, 403);
    assert.equal((await agentC.post('/api/business/complete-onboarding')).status, 403);
  });

  test('owner can complete onboarding, only for their own business', async () => {
    const res = await agentA.post('/api/business/complete-onboarding');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.onboardingCompleted, true);

    assert.equal((await agentA.get('/api/business')).body.data.onboardingCompleted, true);
    assert.equal((await agentB.get('/api/business')).body.data.onboardingCompleted, false);
  });

  // ============================================================
  // SERVICES
  // ============================================================
  test('services require login', async () => {
    assert.equal((await request(app).get('/api/services')).status, 401);
  });

  test('owner can create a service with defaults', async () => {
    const res = await agentA
      .post('/api/services')
      .send({ name: 'Consultation', durationMinutes: 30, priceMinor: 150000 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.bookableOnline, true);
    assert.equal(res.body.data.bufferBeforeMinutes, 0);
    assert.equal(res.body.data.priceMinor, 150000);
    serviceAId = res.body.data.id;
  });

  test('service validation rejects bad input with field errors', async () => {
    const empty = await agentA.post('/api/services').send({});
    assert.equal(empty.status, 400);
    assert.ok(empty.body.errors.name);
    assert.ok(empty.body.errors.durationMinutes);
    assert.ok(empty.body.errors.priceMinor);

    const bad = await agentA.post('/api/services').send({
      name: 'A',
      durationMinutes: 3,
      priceMinor: 12.5,
      bufferBeforeMinutes: 500,
    });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.name);
    assert.ok(bad.body.errors.durationMinutes);
    assert.ok(bad.body.errors.priceMinor);
    assert.ok(bad.body.errors.bufferBeforeMinutes);

    const negative = await agentA
      .post('/api/services')
      .send({ name: 'Free thing', durationMinutes: 30, priceMinor: -5 });
    assert.equal(negative.status, 400);
  });

  test('service names are unique per business, ignoring letter case', async () => {
    const dup = await agentA
      .post('/api/services')
      .send({ name: 'consultation', durationMinutes: 20, priceMinor: 1000 });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.errors.name);
  });

  test('another business can use the same service name', async () => {
    const res = await agentB
      .post('/api/services')
      .send({ name: 'Consultation', durationMinutes: 45, priceMinor: 300000 });
    assert.equal(res.status, 201);
  });

  test('service list supports search, status filter and pagination', async () => {
    for (const name of ['Follow-up', 'Scan']) {
      const res = await agentA
        .post('/api/services')
        .send({ name, durationMinutes: 15, priceMinor: 50000 });
      assert.equal(res.status, 201);
      if (name === 'Scan') scanId = res.body.data.id;
    }

    const all = await agentA.get('/api/services');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.pagination.total, 3);
    assert.deepEqual(
      all.body.data.items.map((s) => s.name),
      ['Consultation', 'Follow-up', 'Scan']
    );

    assert.equal((await agentA.get('/api/services?q=consul')).body.data.items.length, 1);
    assert.equal((await agentA.get('/api/services?q=zzz')).body.data.items.length, 0);

    const p2 = await agentA.get('/api/services?limit=2&page=2');
    assert.equal(p2.body.data.items.length, 1);
    assert.equal(p2.body.data.pagination.pages, 2);

    assert.equal((await agentA.get('/api/services?status=bogus')).status, 400);
  });

  test("business B cannot read or change business A's services", async () => {
    assert.equal((await agentB.get(`/api/services/${serviceAId}`)).status, 404);
    assert.equal(
      (await agentB.patch(`/api/services/${serviceAId}`).send({ priceMinor: 1 })).status,
      404
    );
    const listB = await agentB.get('/api/services');
    assert.equal(listB.body.data.pagination.total, 1);
    assert.equal((await agentA.get(`/api/services/${serviceAId}`)).body.data.priceMinor, 150000);
  });

  test('owner can update a service and businessId in the body is ignored', async () => {
    const res = await agentA.patch(`/api/services/${serviceAId}`).send({
      priceMinor: 200000,
      bufferAfterMinutes: 10,
      businessId: bizB,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.priceMinor, 200000);
    assert.equal(res.body.data.bufferAfterMinutes, 10);
    assert.equal(res.body.data.name, 'Consultation');

    const inDb = await Service.findById(serviceAId);
    assert.equal(inDb.businessId.toString(), bizA);

    assert.equal((await agentA.patch(`/api/services/${serviceAId}`).send({})).status, 400);
  });

  test('services are archived, never deleted, and archived names can be reused', async () => {
    const inactive = await agentA.patch(`/api/services/${scanId}`).send({ status: 'inactive' });
    assert.equal(inactive.status, 200);
    const current = await agentA.get('/api/services');
    assert.equal(current.body.data.items.find((s) => s.name === 'Scan').status, 'inactive');

    const archived = await agentA.patch(`/api/services/${scanId}`).send({ status: 'archived' });
    assert.equal(archived.status, 200);
    assert.equal((await agentA.get('/api/services')).body.data.items.length, 2);
    const onlyArchived = await agentA.get('/api/services?status=archived');
    assert.equal(onlyArchived.body.data.items.length, 1);

    const reuse = await agentA
      .post('/api/services')
      .send({ name: 'Scan', durationMinutes: 20, priceMinor: 70000 });
    assert.equal(reuse.status, 201);

    const restore = await agentA.patch(`/api/services/${scanId}`).send({ status: 'active' });
    assert.equal(restore.status, 409);
    assert.ok(restore.body.errors.name);

    const del = await agentA.delete(`/api/services/${serviceAId}`);
    assert.equal(del.status, 404);
    assert.ok(await Service.findById(serviceAId));
  });

  test('receptionist can view services but not create or change them', async () => {
    assert.equal((await agentC.get('/api/services')).status, 200);
    assert.equal(
      (await agentC.post('/api/services').send({ name: 'Hack', durationMinutes: 30, priceMinor: 100 }))
        .status,
      403
    );
    assert.equal(
      (await agentC.patch(`/api/services/${serviceAId}`).send({ priceMinor: 1 })).status,
      403
    );
  });

  test('invalid service ids are rejected without crashing', async () => {
    assert.equal((await agentA.get('/api/services/123')).status, 400);
  });

  // ============================================================
  // STAFF PROFILES
  // ============================================================
  test('staff routes require login', async () => {
    assert.equal((await request(app).get('/api/staff')).status, 401);
  });

  test('owner can create a staff profile and assign services', async () => {
    const list = await agentA.get('/api/services');
    svcFollowUpId = list.body.data.items.find((s) => s.name === 'Follow-up').id;

    const res = await agentA.post('/api/staff').send({
      name: 'Dr Ahmed',
      title: 'Dentist',
      email: 'DR@test.com',
      phone: '0300 1234567',
      color: 'blue',
      serviceIds: [serviceAId],
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.phone, '0300-1234567');
    assert.equal(res.body.data.email, 'dr@test.com');
    assert.equal(res.body.data.color, 'blue');
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.bookableOnline, true);
    assert.equal(res.body.data.hasLogin, false);
    assert.equal(res.body.data.services.length, 1);
    assert.equal(res.body.data.services[0].name, 'Consultation');
    staffAId = res.body.data.id;
  });

  test('staff validation rejects bad input with field errors', async () => {
    const empty = await agentA.post('/api/staff').send({});
    assert.equal(empty.status, 400);
    assert.ok(empty.body.errors.name);

    const bad = await agentA.post('/api/staff').send({
      name: 'A',
      email: 'abc',
      phone: 'abc',
      color: 'neon',
      serviceIds: ['123'],
    });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.name);
    assert.ok(bad.body.errors.email);
    assert.ok(bad.body.errors.phone);
    assert.ok(bad.body.errors.color);
    assert.ok(bad.body.errors['serviceIds.0']);
  });

  test("staff cannot be given another business's or an archived service", async () => {
    const svcB = (await agentB.get('/api/services')).body.data.items[0].id;

    const foreign = await agentA.post('/api/staff').send({ name: 'Foreign Test', serviceIds: [svcB] });
    assert.equal(foreign.status, 400);
    assert.ok(foreign.body.errors.serviceIds);

    const archived = await agentA.post('/api/staff').send({ name: 'Archived Test', serviceIds: [scanId] });
    assert.equal(archived.status, 400);
    assert.ok(archived.body.errors.serviceIds);
  });

  test('owner can update a staff profile; businessId in the body is ignored', async () => {
    const res = await agentA.patch(`/api/staff/${staffAId}`).send({
      title: 'Senior Dentist',
      serviceIds: [serviceAId, svcFollowUpId, svcFollowUpId],
      businessId: bizB,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Senior Dentist');
    assert.equal(res.body.data.services.length, 2);

    const inDb = await Staff.findById(staffAId);
    assert.equal(inDb.businessId.toString(), bizA);

    const cleared = await agentA.patch(`/api/staff/${staffAId}`).send({ serviceIds: [] });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.data.services.length, 0);

    assert.equal((await agentA.patch(`/api/staff/${staffAId}`).send({})).status, 400);
  });

  test('staff list supports search, status filter and pagination', async () => {
    for (const [name, title] of [
      ['Nurse Sana', 'Nurse'],
      ['Ali Hassan', 'Assistant'],
    ]) {
      const res = await agentA.post('/api/staff').send({ name, title });
      assert.equal(res.status, 201);
      if (name === 'Nurse Sana') nurseId = res.body.data.id;
    }

    const all = await agentA.get('/api/staff');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.pagination.total, 3);
    assert.deepEqual(
      all.body.data.items.map((s) => s.name),
      ['Ali Hassan', 'Dr Ahmed', 'Nurse Sana']
    );

    assert.equal((await agentA.get('/api/staff?q=dentist')).body.data.items.length, 1);
    assert.equal((await agentA.get('/api/staff?q=zzz')).body.data.items.length, 0);

    const p2 = await agentA.get('/api/staff?limit=2&page=2');
    assert.equal(p2.body.data.items.length, 1);
    assert.equal(p2.body.data.pagination.pages, 2);

    assert.equal((await agentA.get('/api/staff?status=bogus')).status, 400);
  });

  test("business B cannot see or change business A's staff", async () => {
    const listB = await agentB.get('/api/staff');
    assert.equal(listB.body.data.pagination.total, 0);

    assert.equal((await agentB.get(`/api/staff/${staffAId}`)).status, 404);
    assert.equal((await agentB.patch(`/api/staff/${staffAId}`).send({ title: 'X' })).status, 404);

    const svcB = (await agentB.get('/api/services')).body.data.items[0].id;
    const own = await agentB.post('/api/staff').send({ name: 'B Staff', serviceIds: [svcB] });
    assert.equal(own.status, 201);
    assert.equal((await agentB.get('/api/staff')).body.data.pagination.total, 1);
    assert.equal((await agentA.get(`/api/staff/${staffAId}`)).body.data.title, 'Senior Dentist');
  });

  test('staff are archived, never deleted', async () => {
    const inactive = await agentA.patch(`/api/staff/${nurseId}`).send({ status: 'inactive' });
    assert.equal(inactive.status, 200);
    assert.equal((await agentA.get('/api/staff')).body.data.pagination.total, 3);

    const archived = await agentA.patch(`/api/staff/${nurseId}`).send({ status: 'archived' });
    assert.equal(archived.status, 200);
    assert.equal((await agentA.get('/api/staff')).body.data.pagination.total, 2);
    assert.equal((await agentA.get('/api/staff?status=archived')).body.data.items.length, 1);

    assert.equal((await agentA.delete(`/api/staff/${staffAId}`)).status, 404);
    assert.ok(await Staff.findById(staffAId));
  });

  test('receptionist can view staff but not create or change them', async () => {
    assert.equal((await agentC.get('/api/staff')).status, 200);
    assert.equal((await agentC.post('/api/staff').send({ name: 'Hack Person' })).status, 403);
    assert.equal((await agentC.patch(`/api/staff/${staffAId}`).send({ title: 'X' })).status, 403);
  });

  test('invalid staff ids are rejected without crashing', async () => {
    assert.equal((await agentA.get('/api/staff/123')).status, 400);
  });

  // ============================================================
  // TEAM INVITATIONS
  // ============================================================
  test('team routes require login', async () => {
    assert.equal((await request(app).get('/api/team')).status, 401);
  });

  test('owner can invite a team member; only a token hash is stored', async () => {
    const res = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Rida Khan', email: 'NewRec@test.com', role: 'receptionist' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.inviteLink.includes('/accept-invite?token='));
    assert.equal(res.body.data.invitation.email, 'newrec@test.com');
    inviteToken = tokenFrom(res.body.data.inviteLink);

    const inDb = await Invitation.findOne({ email: 'newrec@test.com' });
    assert.notEqual(inDb.tokenHash, inviteToken);
    assert.equal(inDb.status, 'pending');
    const hours = (inDb.expiresAt.getTime() - Date.now()) / 3600000;
    assert.ok(hours > 47 && hours <= 48);
  });

  test('invitation validation, existing accounts and duplicates are rejected', async () => {
    const empty = await agentA.post('/api/team/invitations').send({});
    assert.equal(empty.status, 400);
    assert.ok(empty.body.errors.name);
    assert.ok(empty.body.errors.email);
    assert.ok(empty.body.errors.role);

    const owner = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Boss Person', email: 'boss@test.com', role: 'owner' });
    assert.equal(owner.status, 400);
    assert.ok(owner.body.errors.role);

    const existing = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Sara Again', email: 'b@test.com', role: 'receptionist' });
    assert.equal(existing.status, 409);
    assert.ok(existing.body.errors.email);

    const dup = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Rida Again', email: 'newrec@test.com', role: 'receptionist' });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.errors.email);
  });

  test('a staff invitation can be linked to a staff profile, with checks', async () => {
    const ok = await agentA.post('/api/team/invitations').send({
      name: 'Dr Ahmed',
      email: 'dr.login@test.com',
      role: 'staff',
      staffId: staffAId,
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.invitation.staffName, 'Dr Ahmed');
    staffInviteToken = tokenFrom(ok.body.data.inviteLink);

    const wrongRole = await agentA.post('/api/team/invitations').send({
      name: 'X Person',
      email: 'x1@test.com',
      role: 'receptionist',
      staffId: staffAId,
    });
    assert.equal(wrongRole.status, 400);
    assert.ok(wrongRole.body.errors.staffId);

    const foreignStaff = (await agentB.get('/api/staff')).body.data.items[0].id;
    const foreign = await agentA.post('/api/team/invitations').send({
      name: 'X Person',
      email: 'x2@test.com',
      role: 'staff',
      staffId: foreignStaff,
    });
    assert.equal(foreign.status, 400);
    assert.ok(foreign.body.errors.staffId);

    const twice = await agentA.post('/api/team/invitations').send({
      name: 'Dr Ahmed Two',
      email: 'dr.two@test.com',
      role: 'staff',
      staffId: staffAId,
    });
    assert.equal(twice.status, 409);
  });

  test('team list shows only own members and invitations', async () => {
    const a = await agentA.get('/api/team');
    assert.equal(a.status, 200);
    assert.equal(a.body.data.members.length, 1);
    assert.equal(a.body.data.members[0].role, 'owner');
    assert.equal(a.body.data.members[0].isYou, true);
    assert.equal(a.body.data.invitations.length, 2);
    assert.ok(!JSON.stringify(a.body).includes('tokenHash'));

    const b = await agentB.get('/api/team');
    assert.equal(b.body.data.members.length, 1);
    assert.equal(b.body.data.invitations.length, 0);
  });

  test('anyone with a valid link can see the invitation, bad links are 404', async () => {
    const ok = await request(app).get(`/api/invitations/${inviteToken}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.email, 'newrec@test.com');
    assert.equal(ok.body.data.role, 'receptionist');
    assert.equal(ok.body.data.businessName, 'Clinic One');
    assert.ok(!JSON.stringify(ok.body).includes('tokenHash'));

    assert.equal((await request(app).get(`/api/invitations/${'a'.repeat(64)}`)).status, 404);
  });

  test('accepting creates the account in the right business, once only', async () => {
    const weak = await request(app)
      .post('/api/invitations/accept')
      .send({ token: inviteToken, password: 'abcdefgh' });
    assert.equal(weak.status, 400);
    assert.ok(weak.body.errors.password);

    const bad = await request(app)
      .post('/api/invitations/accept')
      .send({ token: 'b'.repeat(64), password: 'Rec12345' });
    assert.equal(bad.status, 400);

    const ok = await request(app)
      .post('/api/invitations/accept')
      .send({ token: inviteToken, password: 'Rec12345' });
    assert.equal(ok.status, 200);

    const reuse = await request(app)
      .post('/api/invitations/accept')
      .send({ token: inviteToken, password: 'Rec12345' });
    assert.equal(reuse.status, 400);

    const newUser = await User.findOne({ email: 'newrec@test.com' });
    const member = await BusinessMember.findOne({ userId: newUser._id });
    assert.equal(member.businessId.toString(), bizA);
    assert.equal(member.role, 'receptionist');

    const login = await recAgent.post('/api/auth/login').send({ email: 'newrec@test.com', password: 'Rec12345' });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.role, 'receptionist');
    assert.equal(login.body.data.business.id, bizA);

    assert.equal((await recAgent.get('/api/services')).status, 200);
    assert.equal((await recAgent.post('/api/staff').send({ name: 'Hack Person' })).status, 403);
    assert.equal((await recAgent.get('/api/team')).status, 403);
  });

  test('a staff invitation links the new login to the staff profile', async () => {
    const ok = await request(app)
      .post('/api/invitations/accept')
      .send({ token: staffInviteToken, password: 'Doc12345' });
    assert.equal(ok.status, 200);

    const newUser = await User.findOne({ email: 'dr.login@test.com' });
    const staff = await Staff.findById(staffAId);
    assert.equal(staff.userId.toString(), newUser._id.toString());

    const list = await agentA.get('/api/staff');
    assert.equal(list.body.data.items.find((s) => s.id === staffAId).hasLogin, true);

    const again = await agentA.post('/api/team/invitations').send({
      name: 'Dr Ahmed Three',
      email: 'dr.three@test.com',
      role: 'staff',
      staffId: staffAId,
    });
    assert.equal(again.status, 400);
  });

  test('resend replaces the link, revoke kills it, expired links stop working', async () => {
    const created = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Temp Person', email: 'temp@test.com', role: 'receptionist' });
    const id = created.body.data.invitation.id;
    const oldToken = tokenFrom(created.body.data.inviteLink);

    assert.equal((await agentB.post(`/api/team/invitations/${id}/resend`)).status, 404);
    assert.equal((await agentB.post(`/api/team/invitations/${id}/revoke`)).status, 404);

    const re = await agentA.post(`/api/team/invitations/${id}/resend`);
    assert.equal(re.status, 200);
    const newToken = tokenFrom(re.body.data.inviteLink);
    assert.notEqual(newToken, oldToken);
    assert.equal((await request(app).get(`/api/invitations/${oldToken}`)).status, 404);
    assert.equal((await request(app).get(`/api/invitations/${newToken}`)).status, 200);

    const revoke = await agentA.post(`/api/team/invitations/${id}/revoke`);
    assert.equal(revoke.status, 200);
    assert.equal((await request(app).get(`/api/invitations/${newToken}`)).status, 404);
    assert.equal(
      (await request(app).post('/api/invitations/accept').send({ token: newToken, password: 'Temp12345' }))
        .status,
      400
    );
    assert.equal((await agentA.post(`/api/team/invitations/${id}/revoke`)).status, 404);

    const fresh = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Temp Person', email: 'temp@test.com', role: 'receptionist' });
    assert.equal(fresh.status, 201);
    const freshToken = tokenFrom(fresh.body.data.inviteLink);
    await Invitation.updateOne(
      { email: 'temp@test.com', status: 'pending' },
      { expiresAt: new Date(Date.now() - 1000) }
    );

    assert.equal((await request(app).get(`/api/invitations/${freshToken}`)).status, 404);
    assert.equal(
      (await request(app).post('/api/invitations/accept').send({ token: freshToken, password: 'Temp12345' }))
        .status,
      400
    );
    const team = await agentA.get('/api/team');
    assert.equal(team.body.data.invitations.find((i) => i.email === 'temp@test.com').expired, true);

    const reinvite = await agentA
      .post('/api/team/invitations')
      .send({ name: 'Temp Person', email: 'temp@test.com', role: 'receptionist' });
    assert.equal(reinvite.status, 201);

    assert.equal((await agentA.post('/api/team/invitations/123/resend')).status, 400);
  });

  test('owner can disable and re-enable a member; owner and self are protected', async () => {
    const team = await agentA.get('/api/team');
    const rec = team.body.data.members.find((m) => m.email === 'newrec@test.com');
    const owner = team.body.data.members.find((m) => m.email === 'a@test.com');

    assert.equal((await agentB.patch(`/api/team/members/${rec.id}`).send({ status: 'disabled' })).status, 404);
    assert.equal((await agentA.patch(`/api/team/members/${owner.id}`).send({ status: 'disabled' })).status, 400);
    assert.equal((await agentA.patch(`/api/team/members/${rec.id}`).send({ status: 'bogus' })).status, 400);

    const off = await agentA.patch(`/api/team/members/${rec.id}`).send({ status: 'disabled' });
    assert.equal(off.status, 200);
    assert.equal((await recAgent.get('/api/services')).status, 403);
    const blocked = await request(app).post('/api/auth/login').send({ email: 'newrec@test.com', password: 'Rec12345' });
    assert.equal(blocked.status, 403);

    const on = await agentA.patch(`/api/team/members/${rec.id}`).send({ status: 'active' });
    assert.equal(on.status, 200);
    assert.equal((await recAgent.get('/api/services')).status, 200);
  });

  test('a receptionist cannot invite or manage the team', async () => {
    assert.equal((await agentC.get('/api/team')).status, 403);
    assert.equal(
      (
        await agentC
          .post('/api/team/invitations')
          .send({ name: 'Hack Person', email: 'hack@test.com', role: 'staff' })
      ).status,
      403
    );
  });

  // ============================================================
  // STAFF SCHEDULES
  // ============================================================
  test('staff schedule requires login', async () => {
    assert.equal((await request(app).get(`/api/staff/${staffAId}/schedule`)).status, 401);
  });

  test('a staff member without a saved schedule follows the business hours', async () => {
    const res = await agentA.get(`/api/staff/${staffAId}/schedule`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.customHours, false);
    assert.equal(res.body.data.openingHours.length, 7);
    assert.equal(res.body.data.openingHours.find((d) => d.day === 1).open, '10:00');
    assert.deepEqual(res.body.data.leaves, []);
    assert.equal(res.body.data.timezone, 'Asia/Dubai');
  });

  test('owner can save custom working hours without changing the business hours', async () => {
    const hours = validHours();
    hours[1].open = '12:00';
    hours[1].close = '15:00';
    hours[1].breaks = [];

    const res = await agentA.put(`/api/staff/${staffAId}/schedule/hours`).send({ openingHours: hours });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.customHours, true);
    assert.equal(res.body.data.openingHours.find((d) => d.day === 1).open, '12:00');

    const again = await agentA.get(`/api/staff/${staffAId}/schedule`);
    assert.equal(again.body.data.openingHours.find((d) => d.day === 1).close, '15:00');

    const biz = await agentA.get('/api/business');
    assert.equal(biz.body.data.openingHours.find((d) => d.day === 1).open, '10:00');
  });

  test('invalid working hours are rejected with field errors', async () => {
    const bad = validHours();
    bad[2].open = '18:00';
    bad[2].close = '09:00';
    const res = await agentA.put(`/api/staff/${staffAId}/schedule/hours`).send({ openingHours: bad });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors['openingHours.2.close']);

    const few = await agentA
      .put(`/api/staff/${staffAId}/schedule/hours`)
      .send({ openingHours: validHours().slice(0, 3) });
    assert.equal(few.status, 400);
  });

  test('leave periods: add, overlap, bad dates and sorting', async () => {
    const ok = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: dayPlus(10), endDate: dayPlus(12), type: 'leave', reason: 'Eid' });
    assert.equal(ok.status, 201);
    leaveId = ok.body.data.id;

    const overlap = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: dayPlus(11), endDate: dayPlus(13) });
    assert.equal(overlap.status, 409);
    assert.ok(overlap.body.errors.startDate);

    const reversed = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: dayPlus(20), endDate: dayPlus(18) });
    assert.equal(reversed.status, 400);
    assert.ok(reversed.body.errors.endDate);

    const past = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: '2020-01-01', endDate: '2020-01-05' });
    assert.equal(past.status, 400);
    assert.ok(past.body.errors.endDate);

    const fake = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: '2026-02-31', endDate: '2026-03-02' });
    assert.equal(fake.status, 400);

    const badType = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: dayPlus(30), endDate: dayPlus(31), type: 'holiday' });
    assert.equal(badType.status, 400);

    const earlier = await agentA
      .post(`/api/staff/${staffAId}/schedule/leaves`)
      .send({ startDate: dayPlus(5), endDate: dayPlus(6), type: 'unavailable' });
    assert.equal(earlier.status, 201);

    const list = await agentA.get(`/api/staff/${staffAId}/schedule`);
    assert.equal(list.body.data.leaves.length, 2);
    assert.equal(list.body.data.leaves[0].type, 'unavailable');
  });

  test("leave removal works, and business B cannot touch business A's schedule", async () => {
    staffBId = (await agentB.get('/api/staff')).body.data.items[0].id;

    assert.equal((await agentB.get(`/api/staff/${staffAId}/schedule`)).status, 404);
    assert.equal(
      (await agentB.put(`/api/staff/${staffAId}/schedule/hours`).send({ openingHours: validHours() })).status,
      404
    );
    assert.equal(
      (
        await agentB
          .post(`/api/staff/${staffAId}/schedule/leaves`)
          .send({ startDate: dayPlus(40), endDate: dayPlus(41) })
      ).status,
      404
    );
    assert.equal(
      (await agentB.delete(`/api/staff/${staffBId}/schedule/leaves/${leaveId}`)).status,
      404
    );

    assert.equal((await agentA.delete(`/api/staff/${staffAId}/schedule/leaves/${leaveId}`)).status, 200);
    assert.equal((await agentA.delete(`/api/staff/${staffAId}/schedule/leaves/${leaveId}`)).status, 404);
    assert.equal((await agentA.get(`/api/staff/${staffAId}/schedule`)).body.data.leaves.length, 1);
  });

  test('reset goes back to business hours and keeps leave periods', async () => {
    const res = await agentA.post(`/api/staff/${staffAId}/schedule/reset-hours`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.customHours, false);
    assert.equal(res.body.data.openingHours.find((d) => d.day === 1).open, '10:00');
    assert.equal(res.body.data.leaves.length, 1);
  });

  test('a receptionist can view schedules but not change them', async () => {
    assert.equal((await recAgent.get(`/api/staff/${staffAId}/schedule`)).status, 200);
    assert.equal(
      (await recAgent.put(`/api/staff/${staffAId}/schedule/hours`).send({ openingHours: validHours() })).status,
      403
    );
    assert.equal(
      (
        await recAgent
          .post(`/api/staff/${staffAId}/schedule/leaves`)
          .send({ startDate: dayPlus(50), endDate: dayPlus(51) })
      ).status,
      403
    );
    assert.equal((await recAgent.post(`/api/staff/${staffAId}/schedule/reset-hours`)).status, 403);
  });

  test('invalid schedule ids are rejected without crashing', async () => {
    assert.equal((await agentA.get('/api/staff/123/schedule')).status, 400);
    assert.equal((await agentA.delete(`/api/staff/${staffAId}/schedule/leaves/123`)).status, 400);
  });

  // ============================================================
  // FINAL SWEEP: Phase 3 milestone
  // ============================================================
  test('every protected area rejects anonymous requests, and the old test routes are gone', async () => {
    const urls = [
      '/api/business',
      '/api/services',
      '/api/staff',
      '/api/team',
      `/api/services/${serviceAId}`,
      `/api/staff/${staffAId}/schedule`,
    ];
    for (const url of urls) {
      assert.equal((await request(app).get(url)).status, 401, `${url} should need login`);
    }
    assert.equal((await request(app).get('/api/tenant-test/items')).status, 404);
  });

  test("business B cannot reach any of business A's records, and the reverse", async () => {
    const svcBId = (await agentB.get('/api/services')).body.data.items[0].id;
    const memberAId = (await agentA.get('/api/team')).body.data.members[0].id;

    const asB = [
      ['get', `/api/services/${serviceAId}`],
      ['patch', `/api/services/${serviceAId}`, { priceMinor: 1 }],
      ['get', `/api/staff/${staffAId}`],
      ['patch', `/api/staff/${staffAId}`, { title: 'X' }],
      ['get', `/api/staff/${staffAId}/schedule`],
      ['post', `/api/staff/${staffAId}/schedule/reset-hours`],
      ['patch', `/api/team/members/${memberAId}`, { status: 'disabled' }],
    ];
    for (const [method, url, body] of asB) {
      const res = body ? await agentB[method](url).send(body) : await agentB[method](url);
      assert.equal(res.status, 404, `B ${method} ${url} should be 404`);
    }

    const asA = [
      ['get', `/api/services/${svcBId}`],
      ['get', `/api/staff/${staffBId}`],
      ['get', `/api/staff/${staffBId}/schedule`],
    ];
    for (const [method, url] of asA) {
      assert.equal((await agentA[method](url)).status, 404, `A ${method} ${url} should be 404`);
    }
  });

  // ============================================================
  // LOGOUT
  // ============================================================
  test('logout ends the session', async () => {
    const out = await agentB.post('/api/auth/logout');
    assert.equal(out.status, 200);
    const me = await agentB.get('/api/auth/me');
    assert.equal(me.status, 401);
  });
});