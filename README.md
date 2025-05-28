# WealthAtlas

A full-stack application for tracking your financial assets, investments, and financial goals.

## Architecture

- **Frontend**: NextJS application
- **Backend**: NestJS GraphQL API
- **Database**: MongoDB
- **Deployment**: AWS via Terraform
- **CI/CD**: GitHub Actions


## Quick Start

1. **Set up MongoDB Atlas**:
   ```bash
   # Follow instructions in docs/MONGODB_SETUP.md to create your MongoDB cluster
   # Then set your connection string:
   export MONGODB_URI="mongodb+srv://username:password@cluster0.mongodb.net/wealth-atlas"
   ```

2. **Run the deployment script**:
   ```bash
   ./scripts/deploy.sh
   ```

3. **Follow the on-screen instructions** to complete the deployment.

## Development

### Prerequisites
- Node.js 18+
- pnpm (recommended, faster alternative to npm)
- MongoDB (local or Atlas)

### Local Setup
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/wealth-atlas
   JWT_SECRET=your-secret-key
   ```
4. Start the backend: `pnpm run dev:backend`
5. Start the frontend: `pnpm run dev:frontend` 
6. Generate frontend GraphQL types: `pnpm --filter apps/frontend run codegen`

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.