// React Native Polyfills
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Node.js polyfills
import { Buffer } from 'buffer';

// Global polyfills
global.Buffer = Buffer;
global.process = require('process/browser');

// Stream polyfill
import * as stream from 'readable-stream';
global.stream = stream;

// TextEncoder/TextDecoder polyfill for crypto libraries
import { TextEncoder, TextDecoder } from 'text-encoding';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
