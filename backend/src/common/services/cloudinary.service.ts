import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import { config } from '../../config';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   * @param buffer The file buffer
   * @param folder The folder to store the file in Cloudinary
   * @param originalname Optional original filename to use as public_id (or part of it)
   */
  async uploadFromBuffer(
    buffer: Buffer,
    folder: string,
    originalname?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const options: UploadApiOptions = {
        folder,
        resource_type: 'auto', // Automatically detect image, raw, video
      };

      if (originalname) {
        // Use the original filename without extension for public_id
        const nameWithoutExt = originalname.split('.').slice(0, -1).join('.');
        options.public_id = `${nameWithoutExt}-${Date.now()}`;
      }

      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          return reject(
            ApiError.badRequest(ErrorCode.ATTACHMENT_UPLOAD_FAILED, 'Failed to upload to cloud storage')
          );
        }
        if (!result) {
          return reject(
            ApiError.badRequest(ErrorCode.ATTACHMENT_UPLOAD_FAILED, 'Failed to upload to cloud storage')
          );
        }
        resolve(result);
      });

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete a file from Cloudinary using its secure URL
   * @param fileUrl The secure URL returned by Cloudinary
   */
  async deleteFromUrl(fileUrl: string): Promise<void> {
    try {
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg
      // We need to extract the folder/filename without extension as the public_id
      
      const parts = fileUrl.split('/');
      const uploadIndex = parts.findIndex(p => p === 'upload');
      
      if (uploadIndex === -1) {
        logger.warn(`Could not extract public_id from Cloudinary URL: ${fileUrl}`);
        return;
      }
      
      // parts after 'upload/v123456789' are the public_id
      const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
      // remove extension if not raw
      // actually, if it's a raw file, we need the extension, if it's image we don't.
      // We can just specify resource_type if needed, but 'image' is default and handles extension removal if we do it.
      
      const publicId = publicIdWithExt.split('.').slice(0, -1).join('.') || publicIdWithExt;

      // Determine resource type based on url
      let resourceType = 'image';
      if (fileUrl.includes('/raw/upload/')) {
        resourceType = 'raw';
      } else if (fileUrl.includes('/video/upload/')) {
        resourceType = 'video';
      }

      // If it's raw, public_id must include the extension
      const finalPublicId = resourceType === 'raw' ? publicIdWithExt : publicId;

      await cloudinary.uploader.destroy(finalPublicId, { resource_type: resourceType });
      logger.info(`Deleted file from Cloudinary: ${finalPublicId}`);
    } catch (error) {
      logger.error(`Error deleting from Cloudinary (${fileUrl}):`, error);
      // We don't throw here to prevent blocking deletion flows if Cloudinary file is already gone
    }
  }
}

export const cloudinaryService = new CloudinaryService();
