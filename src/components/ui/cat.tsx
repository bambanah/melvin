/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";

interface CatProps {
	cat: string;
	index: number;
	mouse: {
		left: number;
		top: number;
	};
}

export const Cat: React.FC<CatProps> = ({ cat, mouse }) => {
	const seed = useMemo(() => Math.min(1, Math.random() + 0.2), []);
	const direction = seed > 0.7 ? 1 : -1;
	const originalRot = seed * 360 * direction;

	return (
		<img
			src={`cats/${cat}`}
			className="cat"
			style={{
				rotate: `${Math.floor(originalRot + seed * ((direction === 1 ? mouse.top : mouse.left) / 1000) * 360 * direction)}deg`,
				transform: `
        scale(${seed + Math.min(0.5, (direction * (direction === 1 ? mouse.left : mouse.top)) / 1000)})
        translate(${Math.cos(mouse.left / 100) * 50}px, ${Math.sin(mouse.left / 100) * 50}px)
        `,
				border: "10px solid",
				borderRadius: "10%",
				// Border color is random based on the seed
				borderColor: `hsl(${Math.floor(seed * 360)}, 100%, 50%)`,
			}}
		/>
	);
};
