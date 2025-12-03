import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
        env: {
            apiUrl: process.env.CYPRESS_API_URL || "http://localhost:3000",
            organizerUtorid: process.env.CYPRESS_ORGANIZER_UTORID || "organizer01",
            managerUtorid: process.env.CYPRESS_MANAGER_UTORID || "manager01",
            demoPassword: process.env.CYPRESS_DEMO_PASSWORD || "DevStrongPass!",
        },
        video: false,
        viewportWidth: 1280,
        viewportHeight: 720,
        retries: 1,
    },
});
