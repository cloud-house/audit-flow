/**
 * Asynchronous entry — required for Module Federation singletons.
 * Webpack must evaluate shared modules before rendering.
 */
import('./bootstrap');
