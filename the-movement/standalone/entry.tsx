// Entry for the single-file standalone build (no server; AI narration unavailable).
import { createRoot } from 'react-dom/client';
import App from '../src/components/App';
import '../src/app/globals.css';

createRoot(document.getElementById('root')!).render(<App />);
