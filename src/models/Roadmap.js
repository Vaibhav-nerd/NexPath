import mongoose from 'mongoose'
import { config } from '../config.js'

const roadmapSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      default: 'beginner',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: config.CACHE_TTL_HOURS * 3600, // TTL index in seconds
    },
  },
  {
    timestamps: true,
    bufferCommands: false, // Never hang or block requests when disconnected
  }
)

export const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', roadmapSchema)
