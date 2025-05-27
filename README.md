# WealthAtlas

A full-stack application for tracking your financial assets, investments, and financial goals.

## Architecture

- **Frontend**: NextJS application
- **Backend**: NestJS GraphQL API
- **Database**: MongoDB
- **Deployment**: AWS via Terraform

## Deployment Documentation

We have several documents to help you deploy this application in a cost-effective way:

1. [AWS Deployment Guide](./AWS_DEPLOYMENT.md) - Main deployment architecture overview
2. [Detailed Deployment Instructions](./DEPLOYMENT.md) - Step-by-step deployment guide
3. [MongoDB Setup Guide](./docs/MONGODB_SETUP.md) - How to set up MongoDB Atlas
4. [CI/CD Setup Guide](./docs/CICD_SETUP.md) - Setting up GitHub Actions for automated deployment
5. [AWS Cost Estimation](./docs/COST_ESTIMATION.md) - Breakdown of expected AWS costs

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
- pnpm
- MongoDB (local or Atlas)

### Local Setup
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/wealth-atlas
   JWT_SECRET=your-secret-key
   ```
4. Start the backend: `pnpm --filter backend start:dev`
5. Start the frontend: `pnpm --filter frontend dev`
6. Generate frontend GraphQL types: `cd apps/frontend && pnpm run codegen`

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.