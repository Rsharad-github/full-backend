import mongoose,{Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new Schema({
  username:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true
  },
  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
  },
  fullname:{
    type:String,
    required:true,
    trim:true,
    index:true
  },
  avatar:{
    type:String,//cloudinary url
    required:true,
  },
  coverImage:{
    type:String//cloudinary url
  },
  watchHistory:[
    {
      type:Schema.Types.ObjectId,
      ref:"Video"
    }
  ],
  password:{
    type:String,
    required:[true,'Password is required']
  },
  refreshToken:{
    type:String,
  }
},{timnestamps:true})


userSchema.pre("save",async function(next){//arrow  func has no access to this 
  if (!this.isModified("password")){
    return next();
  }
  this.password = await bcrypt.hash(this.password,10)//10 salt or hash round
  next()
})//save  karne  se pehle callback run karna hai

userSchema.methods.isPasswordCorrect = async function (password){
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken =  function(){
  return jwt.sign(
    {
      _id:this._id,
      email:this.email,
      username:this.username,
      fullname : this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id:this._id,
      email:this.email,
      username:this.username,
      fullname : this.fullname
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = new mongoose.model("User",userSchema)

