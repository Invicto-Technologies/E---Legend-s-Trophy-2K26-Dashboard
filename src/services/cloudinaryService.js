/**
 * Cloudinary Upload Service
 * Provides client-side direct image uploading to Cloudinary REST API.
 * Reads configuration from .env variables:
 *  - REACT_APP_CLOUDINARY_CLOUD_NAME
 *  - REACT_APP_CLOUDINARY_UPLOAD_PRESET
 */

export const getCloudinaryConfig = () => {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUD_NAME || '';
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || process.env.REACT_APP_UPLOAD_PRESET || '';
    const apiKey = process.env.REACT_APP_CLOUDINARY_API_KEY || '';

    return {
        cloudName: cloudName.trim(),
        uploadPreset: uploadPreset.trim(),
        apiKey: apiKey.trim(),
        isConfigured: Boolean(cloudName.trim() && uploadPreset.trim())
    };
};

export const isCloudinaryConfigured = () => {
    return getCloudinaryConfig().isConfigured;
};

/**
 * Upload an image (File or Blob or Base64 dataURL) directly to Cloudinary.
 * @param {File|Blob|string} file - The image file, blob, or base64 dataURL
 * @param {Object} options - Optional parameters like folder or tags
 * @returns {Promise<{ url: string, secure_url: string, public_id: string }>}
 */
export const uploadToCloudinary = async (file, options = {}) => {
    const config = getCloudinaryConfig();

    if (!config.isConfigured) {
        throw new Error(
            'Cloudinary credentials are not configured. Please set REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET in your .env file.'
        );
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);

    if (options.folder) {
        formData.append('folder', options.folder);
    }

    if (options.tags) {
        formData.append('tags', options.tags);
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.error?.message || `Cloudinary upload failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        const secureUrl = data.secure_url || data.url;

        return {
            url: data.url,
            secure_url: secureUrl,
            public_id: data.public_id,
            width: data.width,
            height: data.height,
            format: data.format,
            toString() {
                return secureUrl;
            }
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};
