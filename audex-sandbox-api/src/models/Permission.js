const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  method: { type: String, required: true, uppercase: true, trim: true },
  path: { type: String, required: true, trim: true },
  description: { type: String, default: '' }
}, { timestamps: true });

permissionSchema.index({ method: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);
