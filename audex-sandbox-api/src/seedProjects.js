const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('./models/Project');
const User = require('./models/User');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');

     await Project.deleteMany();

     const sampleProject = await Project.create({
      title: 'Audex Sandbox Integration',
      description: 'Testing RBAC and HttpOnly cookie authentication for Audex task.',
      department: 'IT'
    });

    console.log('Project added successfully:', sampleProject);
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();