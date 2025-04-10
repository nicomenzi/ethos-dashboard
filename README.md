# Ethos Dashboard

A comprehensive analytics and monitoring platform for tracking user engagement and performance metrics across the Ethos ecosystem.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## 📊 Analytics

This project uses Vercel Analytics to gather anonymous usage data, helping us improve the dashboard experience. The analytics implementation:

- Tracks page views and basic user interactions
- Respects user privacy with anonymous data collection
- Helps identify performance bottlenecks and usability issues

If you're contributing to this project and want to test analytics locally:

```bash
# Analytics are automatically disabled in development mode
# To enable debugging mode for analytics:
npm run dev -- --analytics-debug
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
