const express = require('express');
const cors = require('cors');
require('dotenv').config();

//HINT: You can use the multer npm package to handle file uploading.
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongoose');

const app = express();

//connect to the database
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Failed to connect to MongoDB:", err);
});


let gfs;

const conn = mongoose.connection;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db);
});

const storage = multer.memoryStorage();
const upload = multer({ storage, encoding: 'utf-8' });

//create a new schema to set the doc struture
const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
  },
  size: {
    type: Number,
  },
});


const File = mongoose.model('File', fileSchema);

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


//upload.single('upfile') is a middleware function used to handle the upload of a single file
app.post('/api/fileanalyse', upload.single('upfile'), async (req, res) => {
  try {
    const fileUpload = req.file;

    // 将文件流保存到 GridFS 中
    const uploadStream = gfs.openUploadStream(fileUpload.originalname);
    uploadStream.write(fileUpload.buffer);
    uploadStream.end();

    const file = new File({
      filename: fileUpload.originalname,
      contentType: fileUpload.mimetype,
      size: fileUpload.size,
    });

    await file.save();

    console.log('Added File:', file);
    res.json({
      name: file.filename,
      type: file.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error('Failed to save file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port);
});