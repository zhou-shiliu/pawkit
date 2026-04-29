import catIllustration from '../../assets/cat-static.svg';
import { getTrustTint } from '../../systems/catBehavior';
import { CAT_FACING, type CatFacing } from '../../systems/roamingCat';
import styles from './StaticCatFigure.module.css';

interface StaticCatFigureProps {
  facing?: CatFacing;
  trustLevel: number;
}

export function StaticCatFigure({
  facing = CAT_FACING.RIGHT,
  trustLevel,
}: StaticCatFigureProps) {
  return (
    <figure
      className={styles.figure}
      style={{ ['--trust-halo' as string]: getTrustTint(trustLevel) }}
      aria-label="static cat portrait"
    >
      <div className={styles.floorGlow} aria-hidden="true" />
      <img
        src={catIllustration}
        alt="orange tabby cat"
        className={`${styles.cat} ${facing === CAT_FACING.RIGHT ? styles.right : ''}`}
      />
    </figure>
  );
}
