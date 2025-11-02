// middleware/auth.js
export const isAuthenticated = (req, res, next) => {
    if (req.user) {
      console.log('this is a valid and authenticated user')
    }
    if (!req.user){
        console.log('user not authenticated')
        return res.status(401).json({ message: 'Not logged in' });}
    next();
  };
  
  export const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
      console.log('user is an admin')
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admins only' });
    }
    next();
  };
  