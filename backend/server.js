import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase body size limit

// Initialize SQLite database
const db = new sqlite3.Database('./face_embeddings.db');

// Create table for face embeddings
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS face_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Store base64 images temporarily
const imageStore = new Map();

app.post('/api/store-image', (req, res) => {
  try {
    console.log('Received image upload request');
    const { imageData } = req.body;
    
    if (!imageData) {
      console.log('No image data provided');
      return res.status(400).json({ error: 'Image data is required' });
    }
    
    console.log('Image data length:', imageData.length);
    
    // Check if image data is too large (limit to 10MB)
    if (imageData.length > 10 * 1024 * 1024) {
      console.log('Image data too large:', imageData.length);
      return res.status(413).json({ error: 'Image data too large' });
    }
    
    // Generate a unique token
    const token = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store the image data with the token
    imageStore.set(token, imageData);
    
    console.log('Image stored with token:', token);
    
    // Clean up after 10 minutes
    setTimeout(() => {
      imageStore.delete(token);
    }, 10 * 60 * 1000);
    
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error storing image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/get-image/:token', (req, res) => {
  const { token } = req.params;
  const imageData = imageStore.get(token);
  
  if (!imageData) {
    return res.status(404).json({ error: 'Image not found or expired' });
  }
  
  res.json({ success: true, imageData });
});

// Cosine similarity function
function cosineSimilarity(vecA, vecB) {
  const a = JSON.parse(vecA);
  const b = JSON.parse(vecB);
  
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

// Routes
app.post('/api/register', (req, res) => {
  const { name, embedding } = req.body;
  
  if (!name || !embedding) {
    return res.status(400).json({ error: 'Name and embedding are required' });
  }
  
  const stmt = db.prepare('INSERT INTO face_embeddings (name, embedding) VALUES (?, ?)');
  stmt.run(name, JSON.stringify(embedding), function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      success: true, 
      id: this.lastID,
      message: `Face registered for ${name}` 
    });
  });
  stmt.finalize();
});

app.post('/api/verify', (req, res) => {
  const { embedding, threshold = 0.6 } = req.body;
  
  if (!embedding) {
    return res.status(400).json({ error: 'Embedding is required' });
  }
  
  db.all('SELECT id, name, embedding FROM face_embeddings', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    rows.forEach(row => {
      try {
        const similarity = cosineSimilarity(JSON.stringify(embedding), row.embedding);
        if (similarity > bestSimilarity && similarity >= threshold) {
          bestSimilarity = similarity;
          bestMatch = {
            id: row.id,
            name: row.name,
            similarity: similarity
          };
        }
      } catch (error) {
        console.error('Error calculating similarity:', error);
      }
    });
    
    if (bestMatch) {
      res.json({
        success: true,
        match: true,
        ...bestMatch
      });
    } else {
      res.json({
        success: true,
        match: false,
        message: 'No matching face found'
      });
    }
  });
});

app.get('/api/faces', (req, res) => {
  db.all('SELECT id, name, created_at FROM face_embeddings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access from phone: http://YOUR_IP_ADDRESS:${PORT}`);
});
