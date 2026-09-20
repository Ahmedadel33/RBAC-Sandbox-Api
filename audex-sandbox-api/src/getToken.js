const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

 const user = {
  id: '123456',
  name: 'Ahmed',
  email: 'ahmed@test.com',
  role: 'admin',
  department: 'IT'
};

 const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });

console.log("\nthis is the token generated for user:");
console.log(token);
console.log("-------------------------\n");