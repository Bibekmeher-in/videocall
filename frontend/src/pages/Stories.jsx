import { useState, useEffect } from 'react';
import { useStoryStore, useUIStore } from '../context/store';
import { storyAPI, uploadAPI } from '../services/api';
import socketService from '../socket/socket';
import { FaPlus, FaTimes, FaEye } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { STORY_UPLOAD_ACCEPT, getUploadErrorMessage, validateStoryUpload } from '../utils/uploadValidation';

function Stories() {
    const { stories, setStories, activeStory, setActiveStory } = useStoryStore();
    const { addToast } = useUIStore();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            setLoading(true);
            const { data } = await storyAPI.getStories();
            setStories(data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadStory = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        const file = files[0];
        const validation = validateStoryUpload(file);

        if (!validation.isValid) {
            addToast({ type: 'error', message: validation.errorMessage });
            setUploading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadApi = validation.uploadKind === 'video' ? uploadAPI.uploadVideo : uploadAPI.uploadImage;

            const { data: uploadData } = await uploadApi(formData);

            await storyAPI.createStory({
                mediaUrl: uploadData.url,
                mediaType: validation.mediaType,
                duration: 5
            });

            fetchStories();
        } catch (error) {
            console.error('Error uploading story:', error);
            addToast({
                type: 'error',
                message: getUploadErrorMessage(error, 'Unable to upload story right now. Please try again.')
            });
        } finally {
            setUploading(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop: handleUploadStory,
        accept: STORY_UPLOAD_ACCEPT,
        onDropRejected: () => {
            addToast({
                type: 'error',
                message: 'Stories support JPEG, PNG, GIF, WebP, AVIF, MP4, WebM, and MOV files.'
            });
        }
    });

    const handleViewStory = async (story) => {
        try {
            await storyAPI.viewStory(story._id);
            socketService.viewStory(story.userId._id || story.userId, story._id);
        } catch (error) {
            console.error('Error viewing story:', error);
        }
    };

    const nextStory = () => {
        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
            setActiveStory(null);
        }
    };

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
        }
    };

    if (activeStory && stories.length > 0) {
        const currentUser = stories[currentStoryIndex];
        const currentStoryItem = currentUser?.stories?.[0];

        return (
            <div className="story-container" onClick={nextStory}>
                <div className="story-progress">
                    <div className="story-progress-bar" style={{ width: '100%' }}></div>
                </div>

                <div className="absolute top-4 left-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setActiveStory(null)}
                        className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                        <FaTimes />
                    </button>
                    {currentUser?.user && (
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                                {currentUser.user.avatar ? (
                                    <img src={currentUser.user.avatar} alt={currentUser.user.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                    <span className="text-white font-semibold">{currentUser.user.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-white font-semibold">{currentUser.user.name}</span>
                        </div>
                    )}
                </div>

                <div className="absolute top-4 right-4 text-white text-sm">
                    <FaEye className="inline mr-1" />
                    {currentStoryItem?.viewCount || 0} views
                </div>

                <div className="w-full max-w-md h-full" onClick={(e) => e.stopPropagation()}>
                    {currentStoryItem?.mediaType === 'video' ? (
                        <video
                            src={currentStoryItem.mediaUrl}
                            autoPlay
                            loop
                            className="w-full h-full object-contain"
                            onEnded={nextStory}
                        />
                    ) : (
                        <img
                            src={currentStoryItem?.mediaUrl}
                            alt="Story"
                            className="w-full h-full object-contain"
                            onLoad={() => {
                                setTimeout(nextStory, 5000);
                            }}
                        />
                    )}
                </div>

                <div className="absolute inset-0 flex" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1" onClick={prevStory}></div>
                    <div className="flex-1" onClick={nextStory}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6">Stories</h1>

            <div className="mb-6">
                <div
                    {...getRootProps()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                    <input {...getInputProps()} />
                    {uploading ? (
                        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                    ) : (
                        <>
                            <FaPlus className="text-2xl text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Add Story</span>
                        </>
                    )}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">My Story</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
            ) : stories.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No stories yet. Be the first to add one!
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {stories.map((userStories, index) => (
                        <div
                            key={userStories.user?._id || index}
                            onClick={() => {
                                setCurrentStoryIndex(index);
                                setActiveStory(userStories.stories[0]);
                                handleViewStory(userStories.stories[0]);
                            }}
                            className="cursor-pointer"
                        >
                            <div className="relative w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-r from-primary-500 to-secondary-500">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {userStories.user?.avatar ? (
                                        <img src={userStories.user.avatar} alt={userStories.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-primary-500">
                                            {userStories.user?.name?.charAt(0) || '?'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-center text-sm mt-2 truncate">{userStories.user?.name || 'Unknown'}</p>
                            <p className="text-center text-xs text-gray-500">{userStories.stories?.length || 0} stories</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Stories;
