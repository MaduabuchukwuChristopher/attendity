import { createBrowserRouter } from 'react-router-dom';
import { ContentPage } from '../pages/content-page.js';
import { HomePage } from '../pages/home-page.js';
import { NotFoundPage } from '../pages/not-found-page.js';
export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/features', element: <ContentPage /> },
  { path: '/solutions', element: <ContentPage /> },
  { path: '/pricing', element: <ContentPage /> },
  { path: '/about', element: <ContentPage /> },
  { path: '/contact', element: <ContentPage /> },
  { path: '/faq', element: <ContentPage /> },
  { path: '/privacy', element: <ContentPage /> },
  { path: '/terms', element: <ContentPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
