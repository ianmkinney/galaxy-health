// react-three-fiber's native entry. It binds three.js to expo-gl's GLView and
// installs the react-native touch -> raycast bridge, which the plain web entry
// does not do. Metro substitutes GLCanvas.web.js when bundling for web.
export { Canvas, useFrame } from '@react-three/fiber/native';
