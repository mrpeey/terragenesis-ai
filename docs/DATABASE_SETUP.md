# Database Setup Guide

## Local Development Setup

### Option 1: Docker MySQL (Recommended)

1. **Start MySQL container:**
```powershell
docker run --name terragenesis-mysql `
  -e MYSQL_ROOT_PASSWORD=your_root_password `
  -e MYSQL_DATABASE=terragenesis_ai `
  -p 3306:3306 `
  -d mysql:8
```

2. **Create database user:**
```powershell
$env:MYSQL_ROOT_PASSWORD = "your_root_password"
node scripts/create_db_user_root.js
```

3. **Apply schema:**
```powershell
$env:MYSQL_ROOT_PASSWORD = "your_root_password"
node scripts/apply_schema_node.js
```

### Option 2: Local MySQL Installation

1. **Install MySQL 8.0** from https://dev.mysql.com/downloads/mysql/

2. **Create database user:**
```powershell
# Set root password
$env:MYSQL_ROOT_PASSWORD = "your_root_password"
node scripts/create_db_user_root.js
```

3. **Apply schema:**
```powershell
$env:MYSQL_ROOT_PASSWORD = "your_root_password"
node scripts/apply_schema_node.js
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database configuration
DB_HOST=localhost
DB_USER=terra_user
DB_PASSWORD=securepass123
DB_NAME=terragenesis_ai

# For schema setup (don't commit this!)
MYSQL_ROOT_PASSWORD=your_root_password

# Server configuration
PORT=3000
LOG_LEVEL=info

# CORS (comma-separated)
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000
```

## Troubleshooting

### Access Denied Error

If you see: `Access denied for user 'root'@'172.18.0.1'` or similar:

1. **Verify root password:**
```powershell
# Test connection
docker exec -it terragenesis-mysql mysql -uroot -p
```

2. **Check user exists:**
```sql
SELECT user, host FROM mysql.user WHERE user='terra_user';
```

3. **Grant permissions if needed:**
```sql
CREATE USER IF NOT EXISTS 'terra_user'@'%' IDENTIFIED BY 'securepass123';
GRANT ALL PRIVILEGES ON terragenesis_ai.* TO 'terra_user'@'%';
FLUSH PRIVILEGES;
```

### Connection Refused

If MySQL isn't responding:

```powershell
# Check if container is running
docker ps | Select-String "terragenesis-mysql"

# Check logs
docker logs terragenesis-mysql

# Restart container
docker restart terragenesis-mysql
```

## Running the Application

Once the database is set up:

```powershell
# Development with auto-reload
npm run dev

# Production
npm start

# Run tests
npm test
```

## CI/CD Notes

GitHub Actions automatically:
- Starts MySQL 8 service container
- Creates `terra_user` with proper permissions
- Applies the schema
- Runs all tests

No manual setup needed for CI.
