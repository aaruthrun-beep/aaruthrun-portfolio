/** 
 * Gallery init shim — ensures GalleryManager is loaded for gallery.html. 
 * The actual gallery logic lives in modules/gallery/gallery-manager.js.
 */
if (typeof GalleryManager !== 'undefined') {
  GalleryManager.init();
}