import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/users.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId)=>{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave:false})

    return {accessToken,refreshToken}

  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating Access And Refresh Token ")
  }
}
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

const loginUser = asyncHandler(async (req,res)=>{
  //req body -> data
  //username or email
  // find the user
  // psaaword check
  // access and refresh token
  //send cookie

  const {email,username,password}= req.body
  if(!username && !email){
    throw new ApiError(400,"username or password is required")
  }

  const user = await User.findOne({
    $or:[{username},{email}]
  })

  if(!user){
    throw new ApiError(404,"user doesn't exist")
  }

  const  isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly:true,
    secure:true
  }
  return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",refreshToken,options)
            .json(
              new ApiResponse(
                200,{
                  user:loggedInUser,accessToken,refreshToken
                },
                "User logged in Successfully"
              )
            )
})


const logoutUser = asyncHandler(async(req,res)=>{
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
      new :true
    }
  )
  const options = {
    httpOnly:true,
    secure:true
  }

  return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(new ApiResponse(200,{},"User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorised request")

  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.RFRESH_TOKEN_SECRET
    )
  
    const user = User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh Token")
    }
  
    if(incomingRefreshToken !== user.refreshToken){
      throw new ApiError(401,"Refresh token expired or used")
    }
  
    const options = {
      httpOnly:true,
      secure:true
    }
  
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
  
    return res
              .status(200)
              .cookie("accessToken",accessToken)
              .cookie("refreshToken",refreshToken)
              .json(
                new ApiResponse(
                  200,
                  {accessToken,refreshToken:newRefreshToken},
                  "Access token refreshed"
                )
              )
  } catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh Token")
  }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const { oldPassword , newPassword} = req.body


  const user = await User.findById(req.user?.id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid old Password")
  }

  user.password = newPassword
  await user.save({valiadteBeforeSave:false})

  return res
            .status(200)
            .json(new ApiResponse(200,{},"Password changed"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
            .status(200)
            .json(200,req.user,"current user fetched successfully")
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullname,email} = req.body
   
  if(!fullname || !email){
    throw new ApiError(400,"All feilds are required")
  }

  User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname,
        email
      }
    },
    {new:true}).select("-password")

    return res
              .status(200)
              .json(new ApiResponse(200,user,"Account Details updated successfully"))

})


const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {
      new :true
    }
  ).select("-password")

  return res
          .status(200)
          .json(
            new ApiError(200,"avatar updated successfully")
          )
})


const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400,"Cover Image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading on cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {
      new :true
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiError(200,"cover image updated successfully")
  )
})
export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateAccountDetails,
  uploadOnCloudinary,
  updateUserCoverImage
}


//email password liya db me check kiya if exits rdicrect to login or not then cerate new user