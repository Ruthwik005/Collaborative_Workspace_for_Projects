import mongoose from 'mongoose'
import Task from '../src/models/Task.js'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synergysphere'

async function fixTaskStatuses() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find all tasks with invalid status values
    const invalidTasks = await Task.find({
      status: { $nin: ['todo', 'in-progress', 'done'] }
    })

    console.log(`Found ${invalidTasks.length} tasks with invalid status values`)

    if (invalidTasks.length === 0) {
      console.log('No invalid status values found. Database is clean!')
      return
    }

    // Fix each invalid task
    for (const task of invalidTasks) {
      console.log(`Fixing task: ${task.title} (ID: ${task._id})`)
      console.log(`Old status: ${task.status}`)
      
      // Reset to 'todo' status
      task.status = 'todo'
      await task.save()
      
      console.log(`Fixed status to: ${task.status}`)
    }

    console.log('✅ All invalid task statuses have been fixed!')
    
    // Verify the fix
    const remainingInvalid = await Task.find({
      status: { $nin: ['todo', 'in-progress', 'done'] }
    })
    
    if (remainingInvalid.length === 0) {
      console.log('✅ Verification successful: No invalid statuses remain')
    } else {
      console.log(`❌ Warning: ${remainingInvalid.length} invalid statuses still exist`)
    }

  } catch (error) {
    console.error('Error fixing task statuses:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run the fix
fixTaskStatuses()
