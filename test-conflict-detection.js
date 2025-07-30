const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/user');
const Event = require('./server/models/event');
const connectDB = require('./server/config/db');

// Connect to the database
connectDB();

const createDummyData = async () => {
  try {
    // 1. Create two users
    const userA = await User.create({
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123'
    });

    console.log('Created users:', userA.name, userB.name);

    // 2. Create an event for User A
    const eventA = await Event.create({
      userId: userA._id,
      title: 'User A Event',
      startTime: new Date('2025-07-25T10:00:00'),
      endTime: new Date('2025-07-25T11:00:00')
    });

    console.log('Created event for User A:', eventA.title);

    // 3. Create a conflicting event for User B
    const eventB = await Event.create({
      userId: userB._id,
      title: 'User B Event',
      startTime: new Date('2025-07-25T10:30:00'),
      endTime: new Date('2025-07-25T11:30:00')
    });

    console.log('Created conflicting event for User B:', eventB.title);

    return { userA, userB, eventA, eventB };

  } catch (error) {
    console.error('Error creating dummy data:', error);
  }
};

const testConflictDetection = async (userA, eventA) => {
  try {
    console.log('\n--- Testing Conflict Detection ---');

    const conflictingEvents = await Event.findConflicting(
      userA._id,
      eventA.startTime,
      eventA.endTime
    );

    console.log('Found conflicting events:', conflictingEvents.map(e => e.title));

    if (conflictingEvents.length > 0) {
      console.log('✅ Test Passed: Conflict detected!');
    } else {
      console.log('❌ Test Failed: No conflict detected.');
    }

  } catch (error) {
    console.error('Error during conflict detection test:', error);
  }
};

const runTest = async () => {
  const data = await createDummyData();
  if (data) {
    await testConflictDetection(data.userA, data.eventA);
    // Clean up the dummy data
    await User.findByIdAndDelete(data.userA._id);
    await User.findByIdAndDelete(data.userB._id);
    await Event.findByIdAndDelete(data.eventA._id);
    await Event.findByIdAndDelete(data.eventB._id);
    console.log('\nCleaned up dummy data.');
  }
  mongoose.connection.close();
};

runTest();