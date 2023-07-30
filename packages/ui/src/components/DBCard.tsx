"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DBCard({
  dbinfo,
}: {
  dbinfo: {
    name: string;
    dockerImage: string;
    tags: string[];
    ENV: string[];
    PORT: number;
  };
}) {
  const router = useRouter();
  return (
    <div className="flex mt-4 max-w-2xl flex-col items-center rounded-md border md:flex-row">
      <div className="h-full w-full md:h-[200px] md:w-[300px] p-2 border-r border-white">
        <Image
          width={100}
          height={100}
          src={
            dbinfo.dockerImage == "mariadb"
              ? "/mariadb.png"
              : dbinfo.dockerImage == "mysql"
              ? "/mysql.png"
              : dbinfo.dockerImage == "postgres"
              ? "/postgres.png"
              : "/mongo.svg"
          }
          alt="db"
          className="h-full w-full rounded-md"
        />
      </div>
      <div>
        <div className="p-4">
          <h1 className="inline-flex items-center text-lg font-semibold">
            {dbinfo.name}
          </h1>

          <div className="mt-4">
            {dbinfo.tags.map((tag: string) => (
              <span
                key={tag}
                className="mb-2 mr-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold text-gray-900"
              >
                #{tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => {
              router.push(`/db/new/${dbinfo.dockerImage}`);
            }}
            className="btn btn-primary"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
