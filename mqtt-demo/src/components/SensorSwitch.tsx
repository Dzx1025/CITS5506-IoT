"use client";

import React, { useState, ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SensorSwitchProps {
  options: string[];
  children: ReactElement[];
}

const SensorSwitch: React.FC<SensorSwitchProps> = ({ options, children }) => {
  const [selectedOption, setSelectedOption] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center bg-gray-200 p-1 rounded-full">
        {options.map((option, index) => (
          <motion.button
            key={option}
            className={`py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${
              selectedOption === index
                ? "bg-white text-gray-800 shadow-md"
                : "text-gray-600"
            }`}
            onClick={() => setSelectedOption(index)}
            whileTap={{ scale: 0.95 }}
            layout
          >
            {option}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedOption}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children[selectedOption]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SensorSwitch;
