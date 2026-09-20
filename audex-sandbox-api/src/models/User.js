const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Role = require('./Role');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.Mixed, default: 'viewer' },
  roleName: { type: String, default: 'viewer' },
  department: { type: String, default: 'General' }
}, { timestamps: true });

userSchema.pre('validate', async function(next) {
  if (this.role && typeof this.role === 'string') {
    if (mongoose.Types.ObjectId.isValid(this.role)) {
      this.role = new mongoose.Types.ObjectId(this.role);
    } else {
      const existingRole = await Role.findOne({ name: String(this.role).toLowerCase() });
      if (existingRole) {
        this.role = existingRole._id;
        this.roleName = existingRole.name;
      }
    }
  }

  if (this.role && typeof this.role === 'object') {
    const currentRole = await Role.findById(this.role);
    if (currentRole) {
      this.roleName = currentRole.name;
    }
  }

  if (!this.roleName) {
    this.roleName = 'viewer';
  }

  next();
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);