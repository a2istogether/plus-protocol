/**
 * Form Data & File Upload Example
 * Demonstrates handling of different form data types
 */

const { 
  Server, 
  logger, 
  json,
  urlencoded,
  multipart,
  cors 
} = require('../dist/index');

async function main() {
  const app = new Server();

  // ===== Middleware =====
  app.use(logger());
  app.use(cors());

  // ===== 1. JSON Form Data =====
  app.use(json());

  app.post('/api/json-form', (req, res) => {
    console.log('JSON Form Data:', req.body);
    
    res.json({
      success: true,
      message: 'JSON form data received',
      data: req.body
    });
  });

  // ===== 2. URL-Encoded Form Data =====
  app.use(urlencoded({ extended: true }));

  app.post('/api/form-data', (req, res) => {
    console.log('URL-Encoded Form Data:', req.body);
    
    res.json({
      success: true,
      message: 'Form data received',
      data: req.body
    });
  });

  // ===== 3. File Upload (Single File) =====
  app.post('/api/upload/single', 
    multipart({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
      },
      fileFilter: (file) => {
        // Only allow images
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        return allowedTypes.includes(file.mimetype);
      }
    }),
    (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      console.log('File uploaded:', {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });

      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          encoding: req.file.encoding
        },
        // Also include any form fields
        formData: req.body
      });
    }
  );

  // ===== 4. Multiple File Upload =====
  app.post('/api/upload/multiple',
    multipart({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10 // Max 10 files
      }
    }),
    (req, res) => {
      if (Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      console.log('Multiple files uploaded:', Object.keys(req.files));

      // Process all uploaded files
      const uploadedFiles = [];
      
      for (const [fieldname, file] of Object.entries(req.files)) {
        if (Array.isArray(file)) {
          // Multiple files with same field name
          for (const f of file) {
            uploadedFiles.push({
              fieldname: f.fieldname,
              originalname: f.originalname,
              mimetype: f.mimetype,
              size: f.size
            });
          }
        } else {
          // Single file
          uploadedFiles.push({
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          });
        }
      }

      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles,
        formData: req.body
      });
    }
  );

  // ===== 5. Profile Update (Form + File) =====
  app.post('/api/profile/update',
    multipart({
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB for profile pic
        files: 1
      },
      fileFilter: (file) => {
        // Only images for profile picture
        return file.mimetype.startsWith('image/');
      }
    }),
    (req, res) => {
      console.log('Profile update:', {
        formData: req.body,
        hasFile: !!req.file
      });

      const response: any = {
        success: true,
        message: 'Profile updated successfully',
        profile: req.body
      };

      if (req.file) {
        response.profilePicture = {
          filename: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        };
      }

      res.json(response);
    }
  );

  // ===== 6. Document Upload with Metadata =====
  app.post('/api/documents/upload',
    multipart({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5
      },
      fileFilter: (file) => {
        // Allow documents
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        return allowedTypes.includes(file.mimetype);
      }
    }),
    (req, res) => {
      const { title, description, category } = req.body;
      
      if (!title || !req.file) {
        return res.status(400).json({
          success: false,
          error: 'Title and file are required'
        });
      }

      console.log('Document uploaded:', {
        title,
        description,
        category,
        filename: req.file.originalname
      });

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: Date.now(),
          title,
          description,
          category,
          file: {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          },
          uploadedAt: new Date().toISOString()
        }
      });
    }
  );

  // ===== 7. Bulk Upload Example =====
  app.post('/api/bulk-upload',
    multipart({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB total
        files: 20 // Max 20 files
      }
    }),
    (req, res) => {
      const files = req.files;
      const totalSize = Object.values(files).reduce((sum, file) => {
        if (Array.isArray(file)) {
          return sum + file.reduce((s, f) => s + f.size, 0);
        }
        return sum + file.size;
      }, 0);

      console.log(`Bulk upload: ${Object.keys(files).length} files, ${totalSize} bytes total`);

      res.json({
        success: true,
        message: 'Bulk upload completed',
        stats: {
          filesCount: Object.keys(files).length,
          totalSize: totalSize,
          sizeFormatted: formatBytes(totalSize)
        }
      });
    }
  );

  // ===== Error Handling =====
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  });

  // ===== Start Server =====
  await app.listen(8080, () => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   📤 File Upload & Form Data Server         ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('📍 Server running at: 127.0.0.1:8080');
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('');
    console.log('  1️⃣  POST /api/json-form');
    console.log('     Content-Type: application/json');
    console.log('     Body: { "name": "value" }');
    console.log('');
    console.log('  2️⃣  POST /api/form-data');
    console.log('     Content-Type: application/x-www-form-urlencoded');
    console.log('     Body: name=John&email=john@example.com');
    console.log('');
    console.log('  3️⃣  POST /api/upload/single');
    console.log('     Content-Type: multipart/form-data');
    console.log('     Files: 1 image (max 5MB)');
    console.log('');
    console.log('  4️⃣  POST /api/upload/multiple');
    console.log('     Content-Type: multipart/form-data');
    console.log('     Files: up to 10 files (max 5MB each)');
    console.log('');
    console.log('  5️⃣  POST /api/profile/update');
    console.log('     Content-Type: multipart/form-data');
    console.log('     Form fields + profile picture');
    console.log('');
    console.log('  6️⃣  POST /api/documents/upload');
    console.log('     Content-Type: multipart/form-data');
    console.log('     Documents (PDF, DOC, TXT) with metadata');
    console.log('');
    console.log('  7️⃣  POST /api/bulk-upload');
    console.log('     Content-Type: multipart/form-data');
    console.log('     Bulk file upload (max 20 files)');
    console.log('');
    console.log('💡 Test with cURL:');
    console.log('   # JSON');
    console.log('   curl -X POST http://localhost:8080/api/json-form \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"name":"John","email":"john@example.com"}\'');
    console.log('');
    console.log('   # URL-encoded');
    console.log('   curl -X POST http://localhost:8080/api/form-data \\');
    console.log('     -d "name=John&email=john@example.com"');
    console.log('');
    console.log('   # File upload');
    console.log('   curl -X POST http://localhost:8080/api/upload/single \\');
    console.log('     -F "file=@/path/to/image.jpg" \\');
    console.log('     -F "description=My image"');
    console.log('');
  });
}

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

main().catch(console.error);

