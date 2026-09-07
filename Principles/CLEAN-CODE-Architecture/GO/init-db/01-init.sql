-- Enable citext extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS citext;

-- Enable uuid extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extensions are installed
SELECT extname FROM pg_extension WHERE extname IN ('citext', 'uuid-ossp', 'pgcrypto');
