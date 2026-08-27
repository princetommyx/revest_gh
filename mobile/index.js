import { registerRootComponent } from 'expo';

// Registers the background location TaskManager task as a side effect.
// Must be imported at the top level (not inside a component) so it runs
// even when the OS relaunches the JS bundle headlessly to deliver a
// background location update.
import './src/tasks/collectorLocationTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
