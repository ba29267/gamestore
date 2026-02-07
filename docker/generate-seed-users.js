#!/usr/bin/env node
/**
 * Generate seed users with proper bcrypt hashing
 * Usage: node generate-seed-users.js
 * Output: SQL INSERT statements with properly hashed passwords
 */

const bcrypt = require('bcryptjs');

// Define users to seed
const users = [
  {
    username: 'admin',
    email: 'admin@gamestore.local',
    password: 'admin',
    role: 'ADMIN'
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'admin',
    role: 'USER'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'admin',
    role: 'USER'
  },
  {
    username: 'test_user',
    email: 'test@example.com',
    password: 'admin',
    role: 'USER'
  }
];

async function generateSeedSQL() {
  console.log('-- ============================================================================');
  console.log('-- AUTO-GENERATED SEED USERS (with proper bcrypt hashing)');
  console.log('-- Generated:', new Date().toISOString());
  console.log('-- ============================================================================');
  console.log('');
  console.log('DELETE FROM users;');
  console.log('');
  console.log('INSERT INTO users (username, email, password, role, created_at, updated_at) VALUES');

  const hashedUsers = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const sqlLine = `('${user.username}', '${user.email}', '${hashedPassword}', '${user.role}', NOW(), NOW())`;

    if (i < users.length - 1) {
      hashedUsers.push(sqlLine + ',');
    } else {
      hashedUsers.push(sqlLine + ';');
    }
  }

  hashedUsers.forEach(line => console.log(line));

  console.log('');
  console.log('-- Verify users');
  console.log('SELECT COUNT(*) as total_users FROM users;');
  console.log('');
  console.log('-- ============================================================================');
  console.log('-- Login Credentials:');
  users.forEach(user => {
    console.log(`-- ${user.username} / ${user.email} (password: ${user.password})`);
  });
  console.log('-- ============================================================================');
}

generateSeedSQL().catch(err => {
  console.error('Error generating seed SQL:', err);
  process.exit(1);
});
