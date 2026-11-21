import { Router } from "express";
import { z } from "zod";
import { loginAdmin, loginStaff, sendOtp, verifyOtp } from "./auth.service.js";

const router = Router();

router.post("/otp/send", async (req, res) => {
  const schema = z.object({ phone: z.string().min(10) });

  try {
    const { phone } = schema.parse(req.body);
    const result = await sendOtp(phone);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send OTP.";
    res.status(message === "OTP delivery is not configured." ? 503 : 400).json({ message });
  }
});

router.post("/otp/verify", async (req, res) => {
  const schema = z.object({ phone: z.string().min(10), otp: z.string().length(6) });

  try {
    const { phone, otp } = schema.parse(req.body);
    const result = await verifyOtp(phone, otp);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify OTP.";
    res.status(400).json({ message });
  }
});

router.post("/admin/login", async (req, res) => {
  const schema = z.object({ secretKey: z.string().min(8) });

  try {
    const { secretKey } = schema.parse(req.body);
    const result = await loginAdmin(secretKey);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin login failed.";
    const status =
      error instanceof z.ZodError
        ? 400
        : message === "Invalid admin secret key."
          ? 401
          : 503;
    const responseMessage =
      status === 400
        ? "Provide a valid admin secret key."
        : status === 401
          ? message
          : "Admin login is unavailable. Check restaurant setup and database connection.";
    res.status(status).json({ message: responseMessage });
  }
});

router.post("/staff/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

  try {
    const { email, password } = schema.parse(req.body);
    const result = await loginStaff(email, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    res.status(401).json({ message });
  }
});

export default router;
