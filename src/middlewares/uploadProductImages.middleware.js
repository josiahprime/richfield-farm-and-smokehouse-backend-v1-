import multer from 'multer';

// console.log('we reached here')

// Set up multer to store images in memory (no need for disk storage)
const storage = multer.memoryStorage();

// Allow up to 5 images to be uploaded in the request
// const upload = multer({ storage, limits: { files: 5 } });

// export const uploadMultiple = upload.array('images', 5);  // 'images' is the field name used for the files in the frontend form
const upload = multer({ storage, limits: { files: 5 } });
export const uploadCreateImages = upload.array('images', 4);
export const uploadUpdateImages = upload.array('newImages', 4);

// ✅ Add this for profile picture upload
export const uploadProfilePic = upload.single('profilePic');
