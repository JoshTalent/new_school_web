// backend/fixIndex.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixNotificationIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the notifications collection
    const collection = mongoose.connection.collection('notifications');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('📊 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // Check if the problematic index exists
    const hasDuplicateIndex = indexes.some(index => index.name === 'id_1');
    
    if (hasDuplicateIndex) {
      console.log('🚨 Found duplicate index "id_1", dropping it...');
      
      // Drop the duplicate index
      await collection.dropIndex('id_1');
      console.log('✅ Successfully dropped duplicate index "id_1"');
      
      // List indexes again to confirm
      const newIndexes = await collection.indexes();
      console.log('📊 Updated indexes:');
      newIndexes.forEach(index => {
        console.log(`  - ${index.name}:`, index.key);
      });
    } else {
      console.log('✅ No duplicate index found');
    }

    // Check for any other duplicate key issues
    console.log('\n🔍 Checking schema for duplicate key issues...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixNotificationIndex();