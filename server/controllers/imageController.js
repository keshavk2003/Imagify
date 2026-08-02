import axios from "axios";
import userModel from "../models/userModel.js";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export const generateImage = async (req, res) => {
    try {

        const { userId, prompt } = req.body;

        // Check if prompt exists
        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: "Prompt is required"
            });
        }

        // Find user
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check user credits
        if (user.creditBalance <= 0) {
            return res.status(400).json({
                success: false,
                message: "No credits remaining"
            });
        }

        // Generate image using Cloudflare Workers AI
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
                prompt: prompt
            },
            {
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json"
                },

                 
        
            },
           { responseType: "arraybuffer" }
        );
        // Check Cloudflare response
        if (
            !response.data.success ||
            !response.data.result ||
            !response.data.result.image
        ) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate image"
            });
        }

        const image = response.data.result.image;

        // Deduct one credit
        user.creditBalance -= 1;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Image generated successfully",
            image,
            creditBalance: user.creditBalance
        });

    } catch (error) {

        console.error(
            "Cloudflare Error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message:
                error.response?.data?.errors?.[0]?.message ||
                "Internal Server Error"
        });
    }
};