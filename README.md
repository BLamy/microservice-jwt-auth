# Microservice authorization
A 'just add keys' JWT authentication endpoint.

## Technologies
- Lessons learned from: https://github.com/xmlking/trust-broker
- Typescript
- Koa
- passport
- jwt
- docker
- knex (sqlite3)

## Roadmap
- [x] Setup a basic koa application
- [x] Setup knex users
- [x] Add passport-local to koa application.
- [x] Add JWT support to passport-local
- [x] Create Restful API for users
- [x] Can login to app through GUI
- [x] Can view all users
- [x] Can Add user through GUI
- [x] Developer panel shows jwt.
- [x] developer panel shows decoded claims.
- [ ] Rewrite in typescript
- [ ] Split server into modules
- [ ] Rewrite front end in angular 2
- [ ] Separate each page into it's own element.
- [ ] Setup frontend test
- [ ] admin can edit claims.
- [ ] Naive logout
- [ ] Users display in data table
- [ ] establish socket connection to server
- [ ] login via socket
- [ ] Can see when user was last online in datatable
- [ ] Can Modify User through GUI
- [ ] Can Delete User through GUI
- [ ] View own user profile
- [ ] Edit own user profile
- [ ] logout (clear localstorage)
- [ ] Token Blacklist
- [ ] Convert rest API to GraphQL endpoint
- [ ] GraphiQL console for admin users
- [ ] Open source
- [ ] Add CI
- [ ] Containerize application
- [ ] Link keys write docs
- [ ] Ship to docker hub
- [ ] Docker compose connect to MYSQL
- [ ] Rethink DB
- [ ] Realtime socket communication [Socket Cluster](https://github.com/SocketCluster/socketcluster)
- [ ]
