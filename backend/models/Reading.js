const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true,
    index: true
  },
  watts: {
    type: Number,
    required: [true, 'Wattage reading is required'],
    min: 0
  },
  ts: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now
  },
  isAnomaly: {
    type: Boolean,
    default: false
  },
  average: {
    type: Number,
    default: null
  }
});

// Compound index on (deviceId, ts) for fast time-series queries per device
readingSchema.index({ deviceId: 1, ts: -1 });
readingSchema.index({ ts: -1 });

module.exports = mongoose.model('Reading', readingSchema);
