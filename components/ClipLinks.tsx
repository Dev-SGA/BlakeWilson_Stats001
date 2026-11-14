"use client";

import { useVideoLinks } from "@/components/VideoLinksContext";

type ClipLinksProps = {
  scope: "offensive1v1" | "defensive1v1" | "facing1v1" | "back1v1";
};

export function ClipLinks({ scope }: ClipLinksProps) {
  const {
    offensive1v1VideoLink,
    setOffensive1v1VideoLink,
    defensive1v1VideoLink,
    setDefensive1v1VideoLink,
    facing1v1VideoLink,
    setFacing1v1VideoLink,
    back1v1VideoLink,
    setBack1v1VideoLink,
  } = useVideoLinks();

  const url =
    scope === "offensive1v1"
      ? offensive1v1VideoLink
      : scope === "defensive1v1"
        ? defensive1v1VideoLink
        : scope === "facing1v1"
          ? facing1v1VideoLink
          : back1v1VideoLink;
  const setUrl =
    scope === "offensive1v1"
      ? setOffensive1v1VideoLink
      : scope === "defensive1v1"
        ? setDefensive1v1VideoLink
        : scope === "facing1v1"
          ? setFacing1v1VideoLink
          : setBack1v1VideoLink;
  const trimmed = url.trim();
  const hasUrl = trimmed.length > 0;

  return (
    <div className="clips">
      <p className="section-label">Video clip</p>
      <div className="clips__row">
        <span className="clips__index">1</span>
        <input
          type="url"
          className="clips__input"
          placeholder="Paste video link (Hudl, Drive, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Video link"
        />
        {hasUrl ? (
          <a className="clip clip--ready btn btn--primary" href={trimmed} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        ) : (
          <span className="clips__pending">Pending</span>
        )}
      </div>
    </div>
  );
}
