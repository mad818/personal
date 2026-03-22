import React from 'react';
import { AnimationComponent } from 'some-animation-library';

const AgentAnimation: React.FC = () => {
  return (
    <div className='agent-animations'>
      <AnimationComponent keyframes={require('./keyframes.json')} />
    </div>
  );
};

export default AgentAnimation;