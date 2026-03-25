const { RekognitionClient, CreateCollectionCommand, IndexFacesCommand, SearchFacesByImageCommand, DeleteFacesCommand, ListCollectionsCommand, ListFacesCommand } = require("@aws-sdk/client-rekognition");
require('dotenv').config();

const client = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'thinktech_staff_faces';

/**
 * Ensure the Rekognition collection exists
 */
async function ensureCollectionExists() {
  try {
    const listCommand = new ListCollectionsCommand({});
    const response = await client.send(listCommand);
    
    if (response.CollectionIds && response.CollectionIds.includes(COLLECTION_ID)) {
      console.log(`AWS Rekognition: Collection '${COLLECTION_ID}' already exists.`);
      return true;
    }

    console.log(`AWS Rekognition: Creating collection '${COLLECTION_ID}'...`);
    const createCommand = new CreateCollectionCommand({ CollectionId: COLLECTION_ID });
    await client.send(createCommand);
    console.log(`AWS Rekognition: Collection '${COLLECTION_ID}' created successfully.`);
    return true;
  } catch (error) {
    console.error("AWS Rekognition: Error ensuring collection exists:", error);
    return false;
  }
}

/**
 * Index a face from an image URL or buffer
 * @param {string|Buffer} imageSource - URL to image or Buffer
 * @param {string} userId - ExternalImageId to associate with the face
 */
async function enrollFace(imageSource, userId) {
  try {
    let imageBytes;
    if (Buffer.isBuffer(imageSource)) {
      imageBytes = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
      const axios = require('axios');
      const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
      imageBytes = Buffer.from(response.data, 'binary');
    } else {
      const fs = require('fs');
      imageBytes = fs.readFileSync(imageSource);
    }

    const command = new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: imageBytes },
      ExternalImageId: userId.toString(),
      MaxFaces: 1,
      QualityFilter: "AUTO",
    });

    const response = await client.send(command);
    if (response.FaceRecords && response.FaceRecords.length > 0) {
      console.log(`AWS Rekognition: Enrolled face for user ${userId}`);
      return response.FaceRecords[0].Face.FaceId;
    }
    throw new Error("No face detected in the image");
  } catch (error) {
    console.error(`AWS Rekognition: Failed to enroll face for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Search for a face in the collection
 * @param {Buffer} imageBytes - Captured image buffer from Kiosk app
 */
async function searchFace(imageBytes) {
  try {
    const command = new SearchFacesByImageCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: imageBytes },
      MaxFaces: 1,
      FaceMatchThreshold: 85, // Adjust as needed
    });

    const response = await client.send(command);
    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const match = response.FaceMatches[0];
      console.log(`AWS Rekognition: Found match with confidence ${match.Similarity}%`);
      return {
        userId: match.Face.ExternalImageId,
        confidence: match.Similarity,
        faceId: match.Face.FaceId
      };
    }
    return null;
  } catch (error) {
    console.error("AWS Rekognition: Error searching face:", error.message);
    throw error;
  }
}

/**
 * Delete a face from the collection
 * @param {string} faceId 
 */
async function deleteFace(faceId) {
  try {
    const command = new DeleteFacesCommand({
      CollectionId: COLLECTION_ID,
      FaceIds: [faceId]
    });
    await client.send(command);
    console.log(`AWS Rekognition: Deleted face ${faceId}`);
  } catch (error) {
    console.error("AWS Rekognition: Error deleting face:", error.message);
  }
}

/**
 * List all faces in the collection
 */
async function listFaces() {
  try {
    const command = new ListFacesCommand({
      CollectionId: COLLECTION_ID,
      MaxResults: 100, // Adjust as needed
    });

    const response = await client.send(command);
    return response.Faces || [];
  } catch (error) {
    console.error("AWS Rekognition: Error listing faces:", error.message);
    throw error;
  }
}

module.exports = {
  ensureCollectionExists,
  enrollFace,
  searchFace,
  deleteFace,
  listFaces
};
