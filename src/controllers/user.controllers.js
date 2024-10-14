import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler(async(req,res)=>{
  //get userdetails from frontend
  //validation    - not empty
  //check if user already exist:username or email
  // check for images,check for avatar
  //upload them to clooudinary
  // create user object -create entry in db
  // remove password and refresh token feild from response
  // check for user creation
  // return res


  const {fullname,email,username,password} = req.body
  console.log("email",email)

  if (
    [fullname,email,username,password].some((field)=>field?.trim() ==="")
  ){
    throw new ApiError(400,"All fields are required")
  }
  const existedUser = User.findOne({
    $or:[{username},{email}]//returns first document matching this username and email
  })
  if(existedUser){
    throw new ApiError(409,"user already exist")
  }
  
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path
  
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
  }

  const avatar = await  uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw  new ApiError(400,"avatar file is required")
  }
  User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registererd succesfully")
  )

})

export {registerUser}


//email password liya db me check kiya if exits rdicrect to login or not then cerate new user