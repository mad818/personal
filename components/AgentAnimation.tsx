import React from "react";
import { motion } from "framer-motion";

const ringStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  border: "2px solid rgba(196,72,90,0.55)",
  boxShadow: "0 0 16px rgba(196,72,90,0.25)",
  position: "relative",
};

const coreStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "var(--accent, #c4485a)",
  boxShadow: "0 0 12px rgba(196,72,90,0.75)",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const AgentAnimation: React.FC = () => (
  <div
    className="agent-animations"
    style={{ display: "grid", placeItems: "center" }}
  >
    <motion.div
      style={ringStyle}
      animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        style={coreStyle}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  </div>
);

export default AgentAnimation;
