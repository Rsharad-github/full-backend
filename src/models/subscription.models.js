import mongoose,{Schema} from "mongoose"

const subscriptionSchema = new Schema({
  subscriber:{
    type:Schema.Types.ObjectId,
    ref:"User",
  },
  channel:{
    type:Schema.Types.ObjectId,
    ref:"User"
    
  }
},{
  timetamps:true
})

export const subscription =  mongoose.model("Subscriptions",subscriptionSchema)