# Custom Courseware
Personal Project. Courseware website.

## Setup
run `npm install` to install dependencies

run `npm start` to start server

You have to setup postgres.

If you have docker setup you can just enter `docker compose up -d`

You can check the database logs by running `docker compose logs database`

The database will be ready when you see "database system is ready to accept connections" in the logs.

Once the db is you have to 
load the modals.
Enter `npx prisma generate` and `npx prisma db push`
I'd also recommend installing pgAdmin to interact with the database.

To generate keys of HTTPS run the bash script make-cert.sh
