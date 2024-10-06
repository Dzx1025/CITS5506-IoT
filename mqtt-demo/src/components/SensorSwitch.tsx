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
    <div className="w-full">
      <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-full max-w-md mx-auto">
        <div className="flex justify-between">
          {options.map((option, index) => (
            <motion.button
              key={option}
              className={`py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 flex-1 text-center ${
                selectedOption === index
                  ? "bg-primary text-white shadow-md dark:shadow-lg"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
              onClick={() => setSelectedOption(index)}
              whileTap={{ scale: 0.95 }}
              layout
            >
              {option}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mt-4">
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
    </div>
  );
};

export default SensorSwitch;
